#include <Arduino.h>
#include <DHT.h>
#include "config.h"

// Fase 1: DHT22 validado em GPIO4 (testado fisicamente em 2026-05-28)
// Fase 2: adicionar Wi-Fi + MQTT

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);

  dht.begin();

  Serial.println("=== CuraSense — Firmware v0.1 ===");
  Serial.println("Testando DHT22 no GPIO4...");
}

void loop() {
  float temperatura = dht.readTemperature();
  float umidade     = dht.readHumidity();

  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("[ERRO] Falha na leitura do DHT22. Verifique VCC, GND e DATA.");
    delay(LEITURA_INTERVALO);
    return;
  }

  Serial.printf("Temperatura: %.1f C\n", temperatura);
  Serial.printf("Umidade:     %.1f %%\n", umidade);
  Serial.println("-------------------------");

  delay(LEITURA_INTERVALO);
}
