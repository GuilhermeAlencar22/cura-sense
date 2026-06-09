// Singleton MQTT subscriber — roda no servidor Next.js
// Assina o tópico do ESP32 e mantém a última leitura de cada cura em memória

import mqtt from "mqtt";

export type LeituraESP32 = {
  curaId: string;
  temperatura: number;
  umidade: number;
  bomba: "ligada" | "desligada";
  alerta: "nenhum" | "temp_alta" | "temp_critica" | "umidade_baixa" | "umidade_critica";
  timestamp: string;
};

// Mapa curaId → última leitura recebida
const ultimasLeituras = new Map<string, LeituraESP32>();

let clienteIniciado = false;

export function iniciarMQTT() {
  if (clienteIniciado) return;
  clienteIniciado = true;

  const broker = process.env.MQTT_BROKER_URL;
  if (!broker) {
    console.warn("[MQTT] MQTT_BROKER_URL não definida — subscriber desativado");
    return;
  }

  const cliente = mqtt.connect(broker, {
    clientId: `curasense-server-${Math.random().toString(16).slice(2)}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  cliente.on("connect", () => {
    console.log("[MQTT] Conectado ao broker:", broker);
    cliente.subscribe("curasense/leitura", (err) => {
      if (err) console.error("[MQTT] Erro ao assinar tópico:", err);
      else console.log("[MQTT] Assinando tópico: curasense/leitura");
    });
  });

  cliente.on("message", (_topic, payload) => {
    try {
      const dados = JSON.parse(payload.toString()) as LeituraESP32;
      if (!dados.curaId) {
        console.warn("[MQTT] Mensagem sem curaId ignorada:", dados);
        return;
      }
      dados.timestamp = new Date().toISOString();
      ultimasLeituras.set(dados.curaId, dados);
      console.log(`[MQTT] Leitura recebida — cura ${dados.curaId}: ${dados.temperatura}°C | ${dados.umidade}% RH`);
    } catch {
      console.error("[MQTT] Payload inválido:", payload.toString());
    }
  });

  cliente.on("error", (err) => {
    console.error("[MQTT] Erro de conexão:", err.message);
  });

  cliente.on("reconnect", () => {
    console.log("[MQTT] Reconectando ao broker...");
  });
}

export function getUltimaLeitura(curaId: string): LeituraESP32 | null {
  return ultimasLeituras.get(curaId) ?? null;
}

export function getTodasLeituras(): Map<string, LeituraESP32> {
  return ultimasLeituras;
}
