import mqtt, { MqttClient } from "mqtt";

// Singleton — uma única conexão WebSocket por aba
let client: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (client && client.connected) return client;

  const host = process.env.NEXT_PUBLIC_MQTT_WS_URL ?? "ws://localhost:9001";

  client = mqtt.connect(host, {
    clientId: `curasense-web-${Math.random().toString(16).slice(2, 8)}`,
    keepalive: 30,
    reconnectPeriod: 3000,
    connectTimeout: 8000,
  });

  client.on("error", (err) => {
    console.error("[MQTT] Erro de conexão:", err.message);
  });

  return client;
}
