#pragma once

// Copie este arquivo para config.h e preencha com seus dados:
//   cp src/config.example.h src/config.h

// ─── DHT ─────────────────────────────────────────────────────────────────────
#define DHT_PIN  4
#define DHT_TYPE DHT22

// ─── Pinos de atuadores ───────────────────────────────────────────────────────
#define BOMBA_PIN 18   // relé ou MOSFET da microbomba

// ─── Intervalos (ms) ─────────────────────────────────────────────────────────
#define LEITURA_INTERVALO   3000    // leitura do DHT22
#define HEARTBEAT_INTERVALO 10000   // heartbeat MQTT

// ─── Wi-Fi ───────────────────────────────────────────────────────────────────
#define WIFI_SSID     "SEU_WIFI_AQUI"
#define WIFI_PASSWORD "SUA_SENHA_AQUI"

// ─── MQTT ────────────────────────────────────────────────────────────────────
// IP do PC com Mosquitto (ex: 192.168.1.100) ou hostname do broker na nuvem
#define MQTT_HOST      "192.168.1.100"
#define MQTT_PORT      1883
#define MQTT_CLIENT_ID "curasense-esp32"

// ─── Parâmetros padrão de irrigação ──────────────────────────────────────────
// Substituídos dinamicamente via tópico curasense/{curaId}/config
#define UMIDADE_MINIMA_PADRAO  85.0f   // %  — limiar automático
#define DURACAO_BOMBA_PADRAO   2.5f    // segundos por acionamento
#define VAZAO_ML_POR_SEGUNDO   2.0f    // calibração da bomba
