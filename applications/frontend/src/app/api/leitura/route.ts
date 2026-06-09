// GET /api/leitura — retorna todas as últimas leituras ativas
// O subscriber MQTT é iniciado aqui na primeira chamada

import { NextResponse } from "next/server";
import { iniciarMQTT, getTodasLeituras } from "@/lib/mqttClient";

iniciarMQTT();

export async function GET() {
  const leituras = Object.fromEntries(getTodasLeituras());
  return NextResponse.json(leituras);
}
