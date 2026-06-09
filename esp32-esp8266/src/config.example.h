#pragma once

// Copie para config.h e preencha com seus dados:
//   cp src/config.example.h src/config.h

// ─── Wi-Fi ───────────────────────────────────────────────────────────────────
#define WIFI_SSID     "SEU_WIFI_AQUI"
#define WIFI_PASSWORD "SUA_SENHA_AQUI"

// ─── MQTT ────────────────────────────────────────────────────────────────────
// IP do PC com Mosquitto (descubra com: ipconfig getifaddr en0 no Mac)
#define MQTT_HOST      "192.168.0.14"
#define MQTT_PORT      1883
#define MQTT_CLIENT_ID "curasense-esp32"

// ─── Hardware — pinos validados em bancada ────────────────────────────────────
#define DHT_PIN        5    // GPIO5 — sinal do DHT11
#define DHT_TYPE       DHT11
#define BOMBA_PIN      2    // GPIO2 — relé/MOSFET da microbomba 5V
#define LED_ALERTA_PIN 18   // GPIO18 — LED vermelho de alerta

// ─── Intervalos (ms) ─────────────────────────────────────────────────────────
#define LEITURA_INTERVALO   3000    // leitura do DHT11
#define HEARTBEAT_INTERVALO 10000   // heartbeat MQTT

// ─── Limites ABNT NBR 7212 / NBR 14931 / NBR 5738 ────────────────────────────
#define TEMP_MIN 10.0f
#define TEMP_MAX 32.0f
#define UMID_MIN 95.0f

// ─── Parâmetros da bomba ──────────────────────────────────────────────────────
#define UMIDADE_MINIMA_PADRAO  95.0f
#define DURACAO_BOMBA_PADRAO    2.5f
#define VAZAO_ML_POR_SEGUNDO    2.0f
