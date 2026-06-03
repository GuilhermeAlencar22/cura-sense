// Tópicos MQTT do CuraSense.
// Todos os tópicos com {curaId} são por sessão de cura.
// O ESP32 assina os tópicos de controle/config e publica os demais.

export const MQTT_TOPICS = {
  // ESP32 publica → Frontend consome
  sensor:    (curaId: string) => `curasense/${curaId}/sensor/dht22`,
  bombaReal: (curaId: string) => `curasense/${curaId}/atuador/bomba`,
  status:    (curaId: string) => `curasense/${curaId}/status`,
  alerta:    (curaId: string) => `curasense/${curaId}/alerta`,

  // Frontend publica → ESP32 consome
  bombaCmd:  (curaId: string) => `curasense/${curaId}/controle/bomba`,
  modo:      (curaId: string) => `curasense/${curaId}/controle/modo`,
  config:    (curaId: string) => `curasense/${curaId}/config`,

  // ESP32 publica globalmente (sem curaId)
  heartbeat: "curasense/sistema/heartbeat",
} as const;
