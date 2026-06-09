// GET /api/leitura/[curaId] — retorna a última leitura de uma cura específica
// Chamado pelo frontend a cada 15 minutos (intervalo sincronizado com o firmware)

import { NextRequest, NextResponse } from "next/server";
import { iniciarMQTT, getUltimaLeitura } from "@/lib/mqttClient";

iniciarMQTT();

export async function GET(
  _req: NextRequest,
  { params }: { params: { curaId: string } }
) {
  const leitura = getUltimaLeitura(params.curaId);

  if (!leitura) {
    return NextResponse.json(
      { erro: "Nenhuma leitura recebida ainda para esta cura." },
      { status: 404 }
    );
  }

  return NextResponse.json(leitura);
}
