#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include "config.h"

#define RING_SIZE   20

struct Leitura {
  float temperatura;
  float umidade;
  unsigned long timestamp;
};

static Leitura ringBuffer[RING_SIZE];
static int ringHead  = 0;
static int ringCount = 0;

static unsigned long uptimeSegundos  = 0;
static unsigned long ultimaLeitura   = 0;
static unsigned long ultimoHeartbeat = 0;

static char  activeCuraId[64]   = "";
static bool  modoAutomatico     = true;
static bool  bombaLigada        = false;
static float umidadeMinimaLocal = UMIDADE_MINIMA_PADRAO;
static float duracaoBombaLocal  = DURACAO_BOMBA_PADRAO;

static float tempMinLocal = TEMP_MIN;
static float tempMaxLocal = TEMP_MAX;
static float umidMinLocal = UMID_MIN;

// LED pisca no loop — sem usar delay()
static bool  ledAlerta       = false;
static unsigned long ultimoPiscada = 0;
static bool  ledEstado        = false;

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ─── Helpers ─────────────────────────────────────────────────────────────────
static void topico(char* buf, size_t len, const char* sufixo) {
  snprintf(buf, len, "curasense/%s/%s", activeCuraId, sufixo);
}

static void rbPush(float temp, float umid) {
  ringBuffer[ringHead] = { temp, umid, millis() };
  ringHead = (ringHead + 1) % RING_SIZE;
  if (ringCount < RING_SIZE) ringCount++;
}

static bool rbPop(Leitura& out) {
  if (ringCount == 0) return false;
  int tail = (ringHead - ringCount + RING_SIZE) % RING_SIZE;
  out = ringBuffer[tail];
  ringCount--;
  return true;
}

// ─── LED de alerta com piscar sem delay ──────────────────────────────────────
static bool  ledAlerta    = false;
static bool  ledEstado    = false;
static unsigned long ultimoPiscada = 0;

static void atualizarLedAlerta(float temp, float umid) {
  ledAlerta = (temp < tempMinLocal || temp > tempMaxLocal || umid < umidMinLocal);
  if (!ledAlerta) {
    digitalWrite(LED_ALERTA_PIN, LOW);
    ledEstado = false;
  }
}

// Chamado a cada iteração do loop — pisca rápido durante bomba, lento em alerta
static void loopLed() {
  if (!ledAlerta) return;
  unsigned long agora    = millis();
  unsigned long intervalo = bombaLigada ? 150 : 500;
  if (agora - ultimoPiscada >= intervalo) {
    ultimoPiscada = agora;
    ledEstado     = !ledEstado;
    digitalWrite(LED_ALERTA_PIN, ledEstado ? HIGH : LOW);
  }
}

// ─── Publicação MQTT ──────────────────────────────────────────────────────────
static void publicarSensor(float temp, float umid) {
  if (!activeCuraId[0]) return;
  char top[96];
  topico(top, sizeof(top), "sensor/dht22");
  char payload[128];
  snprintf(payload, sizeof(payload),
    "{\"timestamp\":\"%lu\",\"temperatura\":%.1f,\"umidade\":%.1f}",
    millis() / 1000UL, temp, umid);
  mqtt.publish(top, payload);
}

static void publicarBomba(const char* estado, float duracao, const char* origem) {
  if (!activeCuraId[0]) return;
  char top[96];
  topico(top, sizeof(top), "atuador/bomba");
  float volume = duracao * VAZAO_ML_POR_SEGUNDO;
  char payload[160];
  snprintf(payload, sizeof(payload),
    "{\"timestamp\":\"%lu\",\"estado\":\"%s\",\"duracaoSegundos\":%.0f,\"volumeEstimadoMl\":%.1f,\"origem\":\"%s\"}",
    millis() / 1000UL, estado, duracao, volume, origem);
  mqtt.publish(top, payload);
}

static void publicarHeartbeat() {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"timestamp\":\"%lu\",\"uptimeSegundos\":%lu,\"versaoFirmware\":\"0.3\",\"modoControle\":\"%s\",\"wifiRssi\":%d,\"ledAlerta\":%s}",
    millis() / 1000UL, uptimeSegundos,
    modoAutomatico ? "automatico" : "manual",
    WiFi.RSSI(), ledAlerta ? "true" : "false");
  mqtt.publish("curasense/sistema/heartbeat", payload);
}

// ─── Acionar bomba (usado pelo botão físico E pelo comando MQTT) ──────────────
static void acionarBomba(float duracao, const char* origem) {
  if (bombaLigada) return;
  bombaLigada = true;
  digitalWrite(BOMBA_PIN, HIGH);
  publicarBomba("ligada", duracao, origem);

  Serial.println(">>> BOMBA LIGADA <<<");
  Serial.printf("    Duracao: %.1f s | Volume estimado: %.1f ml | Origem: %s\n",
                duracao, duracao * VAZAO_ML_POR_SEGUNDO, origem);

  delay((unsigned long)(duracao * 1000));

  digitalWrite(BOMBA_PIN, LOW);
  bombaLigada = false;
  publicarBomba("desligada", 0, origem);
  Serial.println(">>> BOMBA DESLIGADA <<<");
}

// ─── MQTT: callback ───────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char msg[256] = {0};
  memcpy(msg, payload, min(length, (unsigned int)255));

  if (strcmp(topic, "curasense/sistema/activeCura") == 0) {
    strncpy(activeCuraId, msg, sizeof(activeCuraId) - 1);
    Serial.printf("[MQTT] Cura ativa: %s\n", activeCuraId);
    char buf[96];
    topico(buf, sizeof(buf), "controle/bomba");  mqtt.subscribe(buf);
    topico(buf, sizeof(buf), "controle/modo");   mqtt.subscribe(buf);
    topico(buf, sizeof(buf), "config");          mqtt.subscribe(buf);
    return;
  }

  if (!activeCuraId[0]) return;

  char topControle[96];
  topico(topControle, sizeof(topControle), "controle/bomba");
  if (strcmp(topic, topControle) == 0) {
    if (strstr(msg, "\"ligar\"")) {
      float dur = duracaoBombaLocal;
      char* p = strstr(msg, "duracaoSegundos");
      if (p) sscanf(p + 16, "%f", &dur);
      acionarBomba(dur, "dashboard");
    } else if (strstr(msg, "\"desligar\"")) {
      digitalWrite(BOMBA_PIN, LOW);
      bombaLigada = false;
      publicarBomba("desligada", 0, "dashboard");
    }
    return;
  }

  char topModo[96];
  topico(topModo, sizeof(topModo), "controle/modo");
  if (strcmp(topic, topModo) == 0) {
    modoAutomatico = (strstr(msg, "automatico") != nullptr);
    Serial.printf("[MQTT] Modo: %s\n", modoAutomatico ? "automatico" : "manual");
    return;
  }

  char topConfig[96];
  topico(topConfig, sizeof(topConfig), "config");
  if (strcmp(topic, topConfig) == 0) {
    char* p;
    p = strstr(msg, "umidadeMinima");   if (p) sscanf(p + 14, "%f", &umidadeMinimaLocal);
    p = strstr(msg, "duracaoSegundos"); if (p) sscanf(p + 16, "%f", &duracaoBombaLocal);
    p = strstr(msg, "tempMin");         if (p) sscanf(p + 8,  "%f", &tempMinLocal);
    p = strstr(msg, "tempMax");         if (p) sscanf(p + 8,  "%f", &tempMaxLocal);
    p = strstr(msg, "umidMin");         if (p) sscanf(p + 8,  "%f", &umidMinLocal);
    Serial.printf("[CONFIG] temp=%.1f-%.1fC umid>=%.1f%%\n", tempMinLocal, tempMaxLocal, umidMinLocal);
    return;
  }
}

// ─── WiFi / MQTT ─────────────────────────────────────────────────────────────
static void conectarWiFi() {
  Serial.printf("[WiFi] Conectando em %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int t = 0;
  while (WiFi.status() != WL_CONNECTED && t < 30) { delay(500); Serial.print("."); t++; }
  if (WiFi.status() == WL_CONNECTED)
    Serial.printf("\n[WiFi] IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  else
    Serial.println("\n[WiFi] Falha — operando offline");
}

static void conectarMQTT() {
  int t = 0;
  while (!mqtt.connected() && t < 5) {
    Serial.printf("[MQTT] Conectando em %s:%d...\n", MQTT_HOST, MQTT_PORT);
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("[MQTT] Conectado!");
      mqtt.subscribe("curasense/sistema/activeCura");
    } else {
      Serial.printf("[MQTT] Falhou rc=%d\n", mqtt.state());
      delay(2000);
    }
    t++;
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BOMBA_PIN,      OUTPUT); digitalWrite(BOMBA_PIN,      LOW);
  pinMode(LED_ALERTA_PIN, OUTPUT); digitalWrite(LED_ALERTA_PIN, LOW);

  dht.begin();

  Serial.println("================================");
  Serial.println("   CuraSense Firmware v0.3");
  Serial.println("================================");
  Serial.printf("  DHT_PIN=%d  BOMBA_PIN=%d  LED_PIN=%d\n",
                DHT_PIN, BOMBA_PIN, LED_ALERTA_PIN);
  Serial.printf("  Alerta quando umidade < %.0f%%\n", umidMinLocal);
  Serial.println("================================");

  conectarWiFi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  conectarMQTT();
}

// ─── Loop ────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (!mqtt.connected())             conectarMQTT();
  mqtt.loop();

  uptimeSegundos = millis() / 1000UL;
  unsigned long agora = millis();

  loopLed();

  // ── Leitura DHT11 ─────────────────────────────────────────────────────────
  if (agora - ultimaLeitura >= LEITURA_INTERVALO) {
    ultimaLeitura = agora;

    float temp = dht.readTemperature();
    float umid = dht.readHumidity();

    if (isnan(temp) || isnan(umid)) {
      Serial.println("[ERRO] Falha na leitura do DHT11");
    } else {
      atualizarLedAlerta(temp, umid);

      Serial.println("---");
      Serial.printf("[SENSOR] Temp: %.1f C | Umid: %.1f%%\n", temp, umid);
      if (ledAlerta) {
        if (umid < umidMinLocal)
          Serial.printf("[ALERTA] Umidade baixa (%.1f%% < %.1f%%) — LED ACESO\n", umid, umidMinLocal);
        if (temp < tempMinLocal)
          Serial.printf("[ALERTA] Temperatura baixa (%.1fC < %.1fC) — LED ACESO\n", temp, tempMinLocal);
        if (temp > tempMaxLocal)
          Serial.printf("[ALERTA] Temperatura alta (%.1fC > %.1fC) — LED ACESO\n", temp, tempMaxLocal);
      } else {
        Serial.println("[OK] Condicoes normais — LED APAGADO");
      }

      rbPush(temp, umid);

      if (mqtt.connected()) {
        Leitura l;
        while (rbPop(l)) publicarSensor(l.temperatura, l.umidade);
      }
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  if (agora - ultimoHeartbeat >= HEARTBEAT_INTERVALO) {
    ultimoHeartbeat = agora;
    if (mqtt.connected()) publicarHeartbeat();
  }
}
