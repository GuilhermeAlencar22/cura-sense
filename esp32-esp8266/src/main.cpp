#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include "config.h"

// ─── Ring Buffer de leituras para envio em burst após reconexão ───────────────
#define RING_SIZE 20

struct Leitura {
  float temperatura;
  float umidade;
  unsigned long timestamp; // millis()
};

static Leitura ringBuffer[RING_SIZE];
static int ringHead = 0;
static int ringCount = 0;

static unsigned long uptimeSegundos = 0;
static unsigned long ultimaLeitura  = 0;
static unsigned long ultimoHeartbeat = 0;

// ─── Variáveis de controle ────────────────────────────────────────────────────
static char    activeCuraId[64]   = "";   // preenchido via curasense/sistema/activeCura
static bool    modoAutomatico     = true;
static bool    bombaLigada        = false;
static float   umidadeMinimaLocal = UMIDADE_MINIMA_PADRAO;
static float   duracaoBombaLocal  = DURACAO_BOMBA_PADRAO;

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ─── Helpers: tópicos dinâmicos ───────────────────────────────────────────────
// Retorna o tópico com curaId embutido. buf deve ter ≥ 96 bytes.
static void topico(char* buf, size_t len, const char* sufixo) {
  snprintf(buf, len, "curasense/%s/%s", activeCuraId, sufixo);
}

// ─── Ring Buffer ──────────────────────────────────────────────────────────────
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

// ─── Publicação MQTT ──────────────────────────────────────────────────────────
static void publicarSensor(float temp, float umid) {
  if (!activeCuraId[0]) return;

  char topSensor[96];
  topico(topSensor, sizeof(topSensor), "sensor/dht22");

  char payload[128];
  snprintf(payload, sizeof(payload),
    "{\"timestamp\":\"%lu\",\"temperatura\":%.1f,\"umidade\":%.1f}",
    millis() / 1000UL, temp, umid);

  mqtt.publish(topSensor, payload);
}

static void publicarBomba(const char* estado, float duracao, const char* origem) {
  if (!activeCuraId[0]) return;

  char topBomba[96];
  topico(topBomba, sizeof(topBomba), "atuador/bomba");

  float volume = duracao * VAZAO_ML_POR_SEGUNDO;
  char payload[160];
  snprintf(payload, sizeof(payload),
    "{\"timestamp\":\"%lu\",\"estado\":\"%s\",\"duracaoSegundos\":%.0f,\"volumeEstimadoMl\":%.1f,\"origem\":\"%s\"}",
    millis() / 1000UL, estado, duracao, volume, origem);

  mqtt.publish(topBomba, payload);
}

static void publicarHeartbeat() {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"timestamp\":\"%lu\",\"uptimeSegundos\":%lu,\"versaoFirmware\":\"0.2\",\"modoControle\":\"%s\",\"wifiRssi\":%d,\"bufferOcupado\":%d,\"bufferCapacidade\":%d}",
    millis() / 1000UL, uptimeSegundos,
    modoAutomatico ? "automatico" : "manual",
    WiFi.RSSI(), ringCount, RING_SIZE);

  mqtt.publish("curasense/sistema/heartbeat", payload);
}

// ─── Lógica de irrigação automática ──────────────────────────────────────────
static void avaliarIrrigacao(float umid) {
  if (!modoAutomatico) return;
  if (bombaLigada)     return;

  if (umid < umidadeMinimaLocal) {
    Serial.printf("[AUTO] Umidade %.1f%% < %.1f%% — acionando bomba\n",
                  umid, umidadeMinimaLocal);

    char topControle[96];
    topico(topControle, sizeof(topControle), "controle/bomba");

    bombaLigada = true;
    digitalWrite(BOMBA_PIN, HIGH);
    publicarBomba("ligada", duracaoBombaLocal, "automatico");

    delay((unsigned long)(duracaoBombaLocal * 1000));

    digitalWrite(BOMBA_PIN, LOW);
    bombaLigada = false;
    publicarBomba("desligada", 0, "automatico");
  }
}

// ─── MQTT: callback de mensagens recebidas ────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char msg[256] = {0};
  memcpy(msg, payload, min(length, (unsigned int)255));

  Serial.printf("[MQTT] %s → %s\n", topic, msg);

  // curasense/sistema/activeCura  → define a cura ativa
  if (strcmp(topic, "curasense/sistema/activeCura") == 0) {
    strncpy(activeCuraId, msg, sizeof(activeCuraId) - 1);
    Serial.printf("[MQTT] CuraId ativa: %s\n", activeCuraId);

    // Assina tópicos específicos desta cura
    char buf[96];
    topico(buf, sizeof(buf), "controle/bomba");
    mqtt.subscribe(buf);
    topico(buf, sizeof(buf), "controle/modo");
    mqtt.subscribe(buf);
    topico(buf, sizeof(buf), "config");
    mqtt.subscribe(buf);
    return;
  }

  if (!activeCuraId[0]) return;

  // controle/bomba → ligar/desligar bomba manualmente
  char topControle[96];
  topico(topControle, sizeof(topControle), "controle/bomba");
  if (strcmp(topic, topControle) == 0) {
    if (strstr(msg, "\"ligar\"")) {
      float dur = duracaoBombaLocal;
      // tenta extrair duracaoSegundos do JSON
      char* p = strstr(msg, "duracaoSegundos");
      if (p) sscanf(p + 16, "%f", &dur);

      bombaLigada = true;
      digitalWrite(BOMBA_PIN, HIGH);
      publicarBomba("ligada", dur, "manual");
      delay((unsigned long)(dur * 1000));
      digitalWrite(BOMBA_PIN, LOW);
      bombaLigada = false;
      publicarBomba("desligada", 0, "manual");
    } else if (strstr(msg, "\"desligar\"")) {
      digitalWrite(BOMBA_PIN, LOW);
      bombaLigada = false;
      publicarBomba("desligada", 0, "manual");
    }
    return;
  }

  // controle/modo → "automatico" | "manual"
  char topModo[96];
  topico(topModo, sizeof(topModo), "controle/modo");
  if (strcmp(topic, topModo) == 0) {
    modoAutomatico = (strstr(msg, "automatico") != nullptr);
    Serial.printf("[MQTT] Modo: %s\n", modoAutomatico ? "automático" : "manual");
    return;
  }

  // config → atualiza parâmetros locais
  char topConfig[96];
  topico(topConfig, sizeof(topConfig), "config");
  if (strcmp(topic, topConfig) == 0) {
    char* p = strstr(msg, "umidadeMinima");
    if (p) sscanf(p + 14, "%f", &umidadeMinimaLocal);
    p = strstr(msg, "duracaoSegundos");
    if (p) sscanf(p + 16, "%f", &duracaoBombaLocal);
    Serial.printf("[MQTT] Config atualizada: umidMin=%.1f dur=%.0f\n",
                  umidadeMinimaLocal, duracaoBombaLocal);
    return;
  }
}

// ─── WiFi / MQTT: conexão ─────────────────────────────────────────────────────
static void conectarWiFi() {
  Serial.printf("[WiFi] Conectando em %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] Falha — operando offline");
  }
}

static void conectarMQTT() {
  int tentativas = 0;
  while (!mqtt.connected() && tentativas < 5) {
    Serial.printf("[MQTT] Conectando em %s:%d...\n", MQTT_HOST, MQTT_PORT);
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("[MQTT] Conectado!");
      mqtt.subscribe("curasense/sistema/activeCura");
    } else {
      Serial.printf("[MQTT] Falhou rc=%d\n", mqtt.state());
      delay(2000);
    }
    tentativas++;
  }
}

// ─── Setup / Loop ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BOMBA_PIN, OUTPUT);
  digitalWrite(BOMBA_PIN, LOW);

  dht.begin();
  Serial.println("=== CuraSense Firmware v0.2 ===");

  conectarWiFi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  conectarMQTT();
}

void loop() {
  // Reconexão automática
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (!mqtt.connected())             conectarMQTT();
  mqtt.loop();

  uptimeSegundos = millis() / 1000UL;

  unsigned long agora = millis();

  // ── Leitura do DHT22 a cada LEITURA_INTERVALO ─────────────────────────────
  if (agora - ultimaLeitura >= LEITURA_INTERVALO) {
    ultimaLeitura = agora;

    float temp = dht.readTemperature();
    float umid = dht.readHumidity();

    if (isnan(temp) || isnan(umid)) {
      Serial.println("[ERRO] Falha DHT — verifique VCC/GND/DATA");
    } else {
      Serial.printf("Temp: %.1fC | Umid: %.1f%% | curaId: %s\n",
                    temp, umid, activeCuraId[0] ? activeCuraId : "(aguardando)");

      rbPush(temp, umid);

      if (mqtt.connected()) {
        // Drena o buffer
        Leitura l;
        while (rbPop(l)) {
          publicarSensor(l.temperatura, l.umidade);
        }
        if (activeCuraId[0]) avaliarIrrigacao(umid);
      }
    }
  }

  // ── Heartbeat a cada 10 s ─────────────────────────────────────────────────
  if (agora - ultimoHeartbeat >= HEARTBEAT_INTERVALO) {
    ultimoHeartbeat = agora;
    if (mqtt.connected()) publicarHeartbeat();
  }
}
