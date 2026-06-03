// ─── Domínio: traço e produção ────────────────────────────────────────────────

export type TipoPeca =
  | "cuba_colorida"
  | "escalda_pes"
  | "pia_gourmet"
  | "bancada"
  | "vaso"
  | "outro";

export type TipoConcreto =
  | "uhpc"
  | "convencional"
  | "armado"
  | "alta_resistencia";

export type StatusConformidade = "conforme" | "desvio_leve" | "desvio_critico";

// ─── Domínio: cura ────────────────────────────────────────────────────────────

export type StatusCura =
  | "aguardando"    // lote registrado, cura ainda não iniciada
  | "em_cura"       // monitoramento ativo
  | "concluida"     // cura finalizada com sucesso
  | "interrompida"; // cancelada manualmente ou por falha

// ─── Domínio: telemetria e controle ──────────────────────────────────────────

export type ModoControle = "manual" | "automatico";

export type EstadoBomba = "ligada" | "desligada";

export type StatusConformidadeTelemetria =
  | "conforme"
  | "desvio_leve"
  | "desvio_critico"
  | "sem_dados";

export type TipoAlerta =
  | "temperatura_alta"
  | "temperatura_baixa"
  | "umidade_baixa"
  | "umidade_alta"
  | "esp32_offline";

// ─── Parâmetros ideais extraídos da receita no momento de iniciar a cura ─────

export type ParametrosCura = {
  temperaturaIdealMin: number;   // °C
  temperaturaIdealMax: number;   // °C
  umidadeIdealMin: number;       // %
  umidadeIdealMax: number;       // %
  regraIrrigacao: RegraIrrigacao;
  modoControle: ModoControle;
};

// Contrato enviado ao ESP32 via tópico curasense/{curaId}/config
export type RegraIrrigacao = {
  vazaoMlPorSegundo: number;     // calibração da bomba — ex: 2.0
  mlPorAcionamento: number;      // volume desejado por ciclo — ex: 5
  duracaoSegundos: number;       // mlPorAcionamento / vazaoMlPorSegundo
  intervaloMinutos: number;      // intervalo mínimo entre acionamentos — ex: 60
  umidadeMinima: number;         // limiar que dispara irrigação no modo automático — ex: 85
};

// ─── Receita de traço ─────────────────────────────────────────────────────────

export type ReceitaTraco = {
  id: string;
  nome: string;
  tipoPeca: TipoPeca;
  tipoConcreto: TipoConcreto;
  // Dosagem padrão (g)
  massaCimento: number;
  massaAgregado: number;
  massaPigmento: number;
  massaAditivos: number;
  massaAgua: number;
  // Relações calculadas
  relacaoAguaCimento: number;
  relacaoMassaAgregado: number;
  // Cura
  diasCura: number;
  ambienteCura: "camara_cura" | "camara_umida" | "exposto";
  // Parâmetros de monitoramento e irrigação (copiados para CuraLote ao iniciar)
  parametrosCura: ParametrosCura;
  observacoes: string;
  criadaEm: string;
};

// ─── Lote de produção ─────────────────────────────────────────────────────────

export type LoteProducao = {
  id: string;
  receitaId: string;
  nomeIdentificacao: string;
  quantidadePecas: number;
  // Dosagem real (g)
  massaCimentoReal: number;
  massaAgregadoReal: number;
  massaPigmentoReal: number;
  massaAditivosReal: number;
  massaAguaReal: number;
  // Relações reais
  relacaoAguaCimentoReal: number;
  relacaoMassaAgregadoReal: number;
  // Conformidade
  conformidade: StatusConformidade;
  desvioPercentualAC: number;
  desvioPercentualMA: number;
  observacoes: string;
  criadoEm: string;
};

// ─── Leitura do DHT22 armazenada no histórico ─────────────────────────────────

export type LeituraCamara = {
  id: string;
  curaId: string;
  timestamp: string;              // ISO 8601
  temperatura: number;            // °C
  umidade: number;                // %
  estadoBomba: EstadoBomba;
};

// ─── Evento de acionamento da bomba ───────────────────────────────────────────

export type EventoBomba = {
  id: string;
  curaId: string;
  timestamp: string;
  duracaoSegundos: number;
  volumeEstimadoMl: number;       // duracaoSegundos × vazaoMlPorSegundo
  origem: "automatico" | "manual";
};

// ─── Cura (acompanhamento de um lote) ────────────────────────────────────────

export type CuraLote = {
  id: string;
  loteId: string;
  receitaId: string;
  inicioCura: string;             // ISO 8601
  previsaoFim: string;            // ISO 8601
  status: StatusCura;
  // Parâmetros ideais copiados da receita — imutáveis após início
  parametros: ParametrosCura;
  // Snapshot da última leitura (cache para exibição rápida)
  temperaturaAtual: number | null;
  umidadeAtual: number | null;
  estadoBomba: EstadoBomba;
  // Histórico
  historico: LeituraCamara[];
  historicoIrrigacao: EventoBomba[];
};

// ─── Payloads MQTT ────────────────────────────────────────────────────────────

// Publicado pelo ESP32 → curasense/{curaId}/sensor/dht22
export type PayloadDHT22 = {
  timestamp: string;
  temperatura: number;
  umidade: number;
};

// Publicado pelo ESP32 → curasense/{curaId}/atuador/bomba
export type PayloadBomba = {
  timestamp: string;
  estado: EstadoBomba;
  duracaoSegundos?: number;
  volumeEstimadoMl?: number;
  origem: "automatico" | "manual";
};

// Publicado pelo Dashboard → curasense/{curaId}/controle/bomba
export type ComandoBomba = {
  acao: "ligar" | "desligar";
  duracaoSegundos?: number;
};

// Publicado pelo Dashboard → curasense/{curaId}/config
export type PayloadConfig = {
  parametros: ParametrosCura;
};

// Publicado pelo ESP32 → curasense/sistema/heartbeat
export type PayloadHeartbeat = {
  timestamp: string;
  uptimeSegundos: number;
  versaoFirmware: string;
  modoControle: ModoControle;
  wifiRssi: number;               // dBm
  bufferOcupado: number;          // leituras armazenadas no Ring Buffer
  bufferCapacidade?: number;      // capacidade total (opcional)
};

// Publicado pelo ESP32 → curasense/{curaId}/alerta
export type PayloadAlerta = {
  timestamp: string;
  tipo: TipoAlerta;
  valorAtual?: number;
  valorEsperadoMin?: number;
  valorEsperadoMax?: number;
  mensagem: string;
};

// ─── Estado em tempo real (gerenciado pelo hook useTelemetria) ────────────────

export type TelemetriaAtiva = {
  curaId: string;
  ultimaLeitura: LeituraCamara | null;
  ultimoEvento: EventoBomba | null;
  esp32Online: boolean;
  ultimoHeartbeat: PayloadHeartbeat | null;
  modoControle: ModoControle;
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

export type ResultadoRelacoes = {
  relacaoAguaCimento: number;
  relacaoMassaAgregado: number;
  desvioPercentualAC: number;
  desvioPercentualMA: number;
  conformidade: StatusConformidade;
};

export type Usuario = {
  email: string;
  nome: string;
};
