"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getMqttClient } from "@/services/mqtt/mqttClient";
import { MQTT_TOPICS } from "@/services/mqtt/mqttTopics";
import {
  PayloadDHT22,
  PayloadBomba,
  PayloadAlerta,
  PayloadHeartbeat,
  TelemetriaAtiva,
  ComandoBomba,
  ParametrosCura,
} from "@/types";
import { registrarLeitura, registrarIrrigacao } from "@/services/curasService";

const HEARTBEAT_TIMEOUT_MS = 15_000; // ESP32 considerado offline após 15 s sem heartbeat

export function useTelemetria(curaId: string | null): TelemetriaAtiva & {
  publicarComandoBomba: (cmd: ComandoBomba) => void;
  publicarConfig: (parametros: ParametrosCura) => void;
  publicarModo: (modo: "automatico" | "manual") => void;
} {
  const [estado, setEstado] = useState<TelemetriaAtiva>({
    curaId: curaId ?? "",
    ultimaLeitura: null,
    ultimoEvento: null,
    esp32Online: false,
    ultimoHeartbeat: null,
    modoControle: "automatico",
  });

  const heartbeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcarOffline = useCallback(() => {
    setEstado((s) => ({ ...s, esp32Online: false }));
  }, []);

  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
    heartbeatTimer.current = setTimeout(marcarOffline, HEARTBEAT_TIMEOUT_MS);
    setEstado((s) => ({ ...s, esp32Online: true }));
  }, [marcarOffline]);

  useEffect(() => {
    if (!curaId) return;

    const client = getMqttClient();

    const topics = [
      MQTT_TOPICS.sensor(curaId),
      MQTT_TOPICS.bombaReal(curaId),
      MQTT_TOPICS.alerta(curaId),
      MQTT_TOPICS.heartbeat,
    ];

    topics.forEach((t) => client.subscribe(t));

    // Informa ao ESP32 qual cura está ativa
    client.publish("curasense/sistema/activeCura", curaId);

    function onMessage(topic: string, raw: Buffer) {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (topic === MQTT_TOPICS.sensor(curaId!)) {
        const p = payload as PayloadDHT22;
        const leitura = {
          id: crypto.randomUUID(),
          curaId: curaId!,
          timestamp: new Date().toISOString(),
          temperatura: p.temperatura,
          umidade: p.umidade,
          estadoBomba: estado.ultimoEvento?.origem === "automatico" ? "ligada" as const : "desligada" as const,
        };
        registrarLeitura(curaId!, {
          temperatura: p.temperatura,
          umidade: p.umidade,
          estadoBomba: leitura.estadoBomba,
        });
        setEstado((s) => ({ ...s, ultimaLeitura: leitura }));
        return;
      }

      if (topic === MQTT_TOPICS.bombaReal(curaId!)) {
        const p = payload as PayloadBomba;
        if (p.estado === "ligada" && p.duracaoSegundos) {
          const evento = {
            id: crypto.randomUUID(),
            curaId: curaId!,
            timestamp: new Date().toISOString(),
            duracaoSegundos: p.duracaoSegundos,
            volumeEstimadoMl: p.volumeEstimadoMl ?? 0,
            origem: p.origem,
          };
          registrarIrrigacao(curaId!, {
            duracaoSegundos: evento.duracaoSegundos,
            volumeEstimadoMl: evento.volumeEstimadoMl,
            origem: evento.origem,
          });
          setEstado((s) => ({ ...s, ultimoEvento: evento }));
        }
        return;
      }

      if (topic === MQTT_TOPICS.alerta(curaId!)) {
        const p = payload as PayloadAlerta;
        console.warn("[MQTT] Alerta ESP32:", p.tipo, p.mensagem);
        return;
      }

      if (topic === MQTT_TOPICS.heartbeat) {
        const p = payload as PayloadHeartbeat;
        resetHeartbeatTimer();
        setEstado((s) => ({
          ...s,
          ultimoHeartbeat: p,
          modoControle: p.modoControle,
        }));
        return;
      }
    }

    client.on("message", onMessage);

    return () => {
      client.off("message", onMessage);
      topics.forEach((t) => client.unsubscribe(t));
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curaId]);

  const publicarComandoBomba = useCallback(
    (cmd: ComandoBomba) => {
      if (!curaId) return;
      const client = getMqttClient();
      client.publish(MQTT_TOPICS.bombaCmd(curaId), JSON.stringify(cmd));
    },
    [curaId]
  );

  const publicarConfig = useCallback(
    (parametros: ParametrosCura) => {
      if (!curaId) return;
      const client = getMqttClient();
      client.publish(MQTT_TOPICS.config(curaId), JSON.stringify({ parametros }));
    },
    [curaId]
  );

  const publicarModo = useCallback(
    (modo: "automatico" | "manual") => {
      if (!curaId) return;
      const client = getMqttClient();
      client.publish(MQTT_TOPICS.modo(curaId), modo);
    },
    [curaId]
  );

  return { ...estado, publicarComandoBomba, publicarConfig, publicarModo };
}
