# CuraSense

### Sistema de Monitoramento de Traço e Cura de Peças de Concreto UHPC

> Protótipo acadêmico desenvolvido para a disciplina de **Sistemas Embarcados**.  
> Universidade — semestre 2025.2

---

## 👥 Integrantes

| Nome |
|------|
| *Guilherme Alencar* |
| *Henrique Lobo* |
| *Joao Victor Nunes* |
| *Caio Fonseca* |
| *Rodrigo Leal* |

---

## Sobre o projeto

Durante a disciplina de Sistemas Embarcados, precisávamos propor um problema real para desenvolver um sistema de monitoramento com ESP32 e telemetria. A ideia inicial era trabalhar com controle de irrigação, mas depois de pesquisar mais, chegamos a um contexto bem mais interessante.

Entramos em contato com uma fabricante real de peças decorativas em concreto UHPC — cubas para banheiro, escalda-pés, pias gourmet. Numa entrevista com ela, percebemos que o problema central não era a irrigação em si, mas algo mais específico: **a falta de padronização no processo de produção e cura das peças**.

Ela relatou que perde peças por trincas com frequência. Essas trincas aparecem principalmente em peças mais finas, como escalda-pés, e a causa mais provável é a variação na dosagem dos insumos e no processo de cura. O traço do UHPC é muito sensível — uma variação pequena na relação água/cimento já pode comprometer a resistência e a aparência final da peça.

O controle atual é feito de forma manual, em anotações, sem rastreabilidade de lote para lote. Não dá para saber, por exemplo, se a peça que trincou usou mais água que o padrão, ou se ficou menos tempo submersa.

A partir daí, o projeto tomou forma: um sistema que registra receitas de traço, acompanha a dosagem real de cada lote, compara com o padrão, e monitora o processo de cura — com sensores integrados ao ESP32 para leituras de temperatura e nível de água do tanque.

---

## 🎯 Objetivo

Desenvolver um **protótipo experimental** de sistema embarcado e dashboard web que permita:

- registrar e padronizar receitas de traço de concreto UHPC;
- comparar a dosagem real utilizada em cada lote com o traço padrão;
- acompanhar o processo de cura com monitoramento de sensores;
- visualizar histórico de lotes, leituras e conformidade de dosagem;
- estabelecer a base para integração futura com ESP32 via MQTT.

O objetivo é **acadêmico e experimental**. O sistema não garante resistência ou qualidade das peças — ele fornece rastreabilidade e dados para que o produtor possa identificar padrões e tomar decisões mais informadas.

---

## 🔍 Problema encontrado

A fabricante entrevistada produzia peças decorativas de UHPC com controle completamente manual. Os principais problemas identificados foram:

- **Perda de peças por trincas** — especialmente em geometrias finas como escalda-pés, onde a relação entre espessura e resistência é crítica;
- **Falta de padronização na dosagem** — pequenas variações na quantidade de cimento, agregado ou água não eram registradas entre lotes;
- **Sem rastreabilidade** — se uma peça trincava, não era possível saber se o problema estava no traço, no tempo de cura ou em outra etapa;
- **Cura sem monitoramento** — as peças ficavam submersas em tanque por 7 dias, mas a temperatura da água e o nível do tanque não eram acompanhados;
- **Controle manual** — tudo era anotado em papel ou de memória, tornando difícil replicar um traço que deu bom resultado.

---

## 💡 Solução proposta

O CuraSense é um protótipo que cobre esse fluxo em três camadas:

**1. Dashboard Web (Next.js)**  
Interface para registrar receitas, produzir lotes, acompanhar curas e visualizar leituras. Roda localmente no computador do operador.

**2. Lógica de conformidade**  
Ao registrar um lote, o sistema compara a dosagem real com a receita padrão e calcula:
- relação água/cimento (A/C) real e o desvio em relação ao padrão;
- relação cimento/agregado real e o desvio;
- classificação de conformidade: conforme (≤ 3%), desvio leve (≤ 8%) ou desvio crítico (> 8%).

**3. Monitoramento com ESP32 (fase futura)**  
O ESP32 lê sensores de temperatura do tanque, nível de água e temperatura ambiente. Os dados são transmitidos via MQTT para o dashboard. Na Fase 1 (atual), as leituras são simuladas pela interface.

---

## 🛠️ Tecnologias utilizadas

### Frontend / Dashboard
| Tecnologia | Uso |
|---|---|
| Next.js 15 | Framework React com App Router |
| TypeScript | Tipagem estática |
| CSS Modules | Estilização sem dependências externas |
| localStorage | Persistência de dados local (Fase 1) |

### Lógica de negócio
| Tecnologia | Uso |
|---|---|
| TypeScript puro | Cálculo de relações A/C, desvios, conformidade |
| Sem banco de dados | Dados armazenados localmente no navegador |

### Hardware (Fase 2 — planejado)
| Componente | Função |
|---|---|
| ESP32 | Microcontrolador principal |
| DHT22 | Sensor de temperatura ambiente |
| DS18B20 | Temperatura da água do tanque |
| HC-SR04 | Nível de água no tanque (ultrassônico) |

### Comunicação IoT (Fase 2 — planejado)
| Tecnologia | Uso |
|---|---|
| MQTT | Protocolo de mensagens para envio de leituras |
| Broker Mosquitto | Intermediário entre ESP32 e dashboard |

---

## 🏗️ Estrutura do sistema

O fluxo do CuraSense segue a sequência natural do processo de produção:

```
Receita de Traço
      ↓
Registrar Lote de Produção
(dosagem real → comparação → conformidade)
      ↓
Iniciar Cura
(vincular lote → previsão de fim → monitoramento)
      ↓
Leituras do Tanque
(temperatura · nível de água · histórico)
      ↓
Dashboard
(visão geral · lotes ativos · alertas)
```

Cada etapa é independente mas conectada às anteriores. Uma cura sempre parte de um lote, e um lote sempre parte de uma receita.

---

## 📁 Estrutura de pastas

```
curasense/
├── src/
│   ├── app/                     # Páginas (Next.js App Router)
│   │   ├── dashboard/           # Visão geral
│   │   ├── receitas/            # Listagem e cadastro de receitas
│   │   │   └── nova/            # Formulário de nova receita
│   │   ├── producao/            # Listagem de lotes
│   │   │   └── nova/            # Registrar novo lote
│   │   ├── curas/               # Listagem de curas
│   │   │   ├── nova/            # Iniciar cura a partir de lote
│   │   │   └── [id]/            # Detalhe e monitoramento da cura
│   │   ├── simulador/           # Simulação de leituras do ESP32
│   │   ├── historico/           # Histórico de leituras
│   │   └── login/               # Autenticação simulada
│   │
│   ├── components/              # Componentes reutilizáveis
│   │   ├── AppShell.tsx         # Guarda de autenticação + layout
│   │   ├── Sidebar.tsx          # Menu de navegação
│   │   ├── StatCard.tsx         # Card de métrica
│   │   └── StatusBadge.tsx      # Badge de status colorido
│   │
│   ├── services/                # Acesso a dados (localStorage)
│   │   ├── receitasService.ts   # CRUD de receitas
│   │   ├── lotesService.ts      # CRUD de lotes + cálculo de conformidade
│   │   ├── curasService.ts      # CRUD de curas + leituras de sensor
│   │   └── usuarioService.ts    # Login simulado
│   │
│   ├── types/
│   │   └── index.ts             # Tipos: ReceitaTraco, LoteProducao, CuraLote, LeituraSensor
│   │
│   └── utils/
│       ├── calcularRelacoes.ts  # Cálculo de A/C, desvios, conformidade
│       └── formatters.ts        # Formatação de datas, labels, helpers
│
├── public/
│   └── docs/                    # Imagens para o README
│
├── package.json
└── README.md
```

---

## ✅ Funcionalidades implementadas

### Receitas de Traço
- Cadastro de receita com nome, tipo de peça, tipo de concreto, dosagem (cimento, agregado, água, pigmento, aditivos), dias de cura e ambiente
- Cálculo automático das relações A/C e cimento/agregado ao preencher o formulário
- Alerta quando a relação A/C está acima do recomendado para UHPC
- 3 receitas de exemplo pré-carregadas: Cuba Colorida, Escalda-Pés Fino, Pia Gourmet

### Lotes de Produção
- Registro de lote vinculado a uma receita padrão
- Preenchimento da dosagem real utilizada
- Comparação em tempo real com o padrão: desvio por insumo, A/C real vs padrão, Cim./Agr. real vs padrão
- Classificação automática de conformidade: conforme (≤ 3%), desvio leve (≤ 8%), desvio crítico (> 8%)
- Listagem de todos os lotes com desvios e conformidade

### Cura
- Início de cura a partir de um lote existente
- Cálculo automático de previsão de término com base nos dias de cura da receita
- Tela de detalhe com barra de progresso, linha do tempo, dados do lote e parâmetros do tanque
- Alerta visual quando temperatura > 30°C ou nível de água está baixo
- Botões de simulação: leitura normal, temperatura alta, nível baixo, normalizar
- Finalização e cancelamento de cura
- Histórico de leituras em tabela com destaque de eventos anômalos

### Dashboard
- Contagem de lotes em cura, em alerta, finalizados e total de receitas
- Tabela de curas ativas com status, temperatura e progresso

### Simulador de Sensores
- Painel para simular leituras do ESP32 em curas ativas
- Controles de temperatura do tanque, temperatura ambiente e nível de água

### Histórico
- Listagem de todas as leituras registradas com filtro por cura

---

## 🔭 Funcionalidades futuras (Fase 2)

A Fase 1 cobre toda a lógica do sistema com dados simulados. A Fase 2 substitui a simulação por dados reais do ESP32:

| Funcionalidade | Descrição |
|---|---|
| Integração com ESP32 | O microcontrolador lê os sensores e publica via MQTT |
| Broker MQTT | Servidor que recebe as mensagens do ESP32 e repassa ao dashboard |
| API de recebimento | Endpoint no Next.js que assina o tópico MQTT e persiste as leituras |
| Sensores reais | DHT22, DS18B20, HC-SR04 substituindo os valores simulados |
| Buffer circular | Estrutura para armazenar as últimas N leituras no ESP32 com acesso O(1) |
| Alertas em tempo real | Notificações imediatas quando sensor ultrapassa limite configurado |

---

## 📚 Parte acadêmica

Este projeto foi desenvolvido com foco nos conceitos da disciplina de Sistemas Embarcados:

### Telemetria e IoT

O ESP32 funciona como nó de sensoriamento. Ele coleta temperatura e nível de água do tanque e publica as leituras num broker MQTT. O dashboard consome esse broker e atualiza a interface em tempo real. Essa arquitetura publisher/subscriber é um dos padrões centrais de IoT.

### Buffer circular

Na Fase 2, o firmware do ESP32 armazenará as leituras localmente usando um **buffer circular** — uma estrutura de dados em que o espaço de memória é fixo e as entradas mais antigas são sobrescritas quando o buffer está cheio.

Isso é relevante em sistemas embarcados porque a memória RAM do ESP32 é limitada (520 KB de SRAM). Comparado a uma lista dinâmica, o buffer circular tem complexidade O(1) para inserção e para remoção da entrada mais antiga, enquanto uma lista ou array dinâmico precisaria de O(n) para reorganizar os elementos.

### Comparação de complexidade

| Operação | Array dinâmico | Buffer circular |
|---|---|---|
| Inserir nova leitura | O(1) amortizado | O(1) |
| Remover a mais antiga | O(n) | O(1) |
| Acesso ao elemento mais recente | O(1) | O(1) |
| Uso de memória | Cresce indefinidamente | Fixo |

Para um sistema embarcado que gera leituras continuamente, o buffer circular é a escolha mais adequada — a memória nunca cresce e o acesso é sempre previsível.

### Integração software + hardware

O projeto conecta intencionalmente duas camadas: firmware em C++ no ESP32 e aplicação web em TypeScript. Esse tipo de integração — que exige definir contratos de comunicação (formato das mensagens MQTT, tópicos, frequência de publicação) — é representativo do que acontece em projetos reais de IoT industrial.

---

## 📸 Screenshots

> *(As imagens abaixo serão adicionadas quando o projeto estiver com o visual finalizado.)*

| Tela | Preview |
|---|---|
| Dashboard | ![Dashboard](./docs/dashboard.png) |
| Receitas | ![Receitas](./docs/receitas.png) |
| Novo Lote | ![Novo Lote](./docs/producao-nova.png) |
| Detalhe da Cura | ![Cura](./docs/cura-detalhe.png) |

---

## ▶️ Como executar o projeto

### Pré-requisitos

Antes de tudo, você precisa ter o **Node.js** instalado na sua máquina.

> Versão recomendada: **Node.js 18 ou superior**  
> Para verificar a versão instalada: `node --version`  
> Para baixar: [nodejs.org](https://nodejs.org)

### Passo a passo

**1. Clone o repositório**

```bash
git clone https://github.com/seu-usuario/curasense.git
cd curasense
```

**2. Instale as dependências**

```bash
npm install
```

Isso vai baixar o Next.js e todas as bibliotecas necessárias. Pode demorar alguns segundos na primeira vez.

**3. Rode o projeto em modo de desenvolvimento**

```bash
npm run dev
```

**4. Acesse no navegador**

```
http://localhost:3000
```

O sistema vai redirecionar para a tela de login automaticamente.

**5. Entre com qualquer e-mail**

Na Fase 1, o login é simulado. Basta digitar qualquer e-mail e clicar em entrar — não há senha real nem autenticação com servidor.

---

## 🧪 Como testar o sistema

Para ver o fluxo completo funcionando, siga esta sequência:

**1. Criar uma receita de traço**
- Acesse **Receitas → Nova Receita**
- Preencha nome, tipo de peça e a dosagem (cimento, agregado, água)
- Observe o cálculo automático da relação A/C enquanto digita
- Salve a receita

**2. Registrar um lote de produção**
- Acesse **Produção → Novo Lote**
- Selecione a receita criada
- Preencha a dosagem real (tente variar um pouco em relação ao padrão)
- Observe o comparativo em tempo real e a classificação de conformidade
- Salve o lote

**3. Iniciar a cura**
- Na listagem de produção, clique em **▶ Iniciar cura** no lote criado
- Revise os dados do lote, a receita e a previsão de término
- Clique em **Iniciar Cura**

**4. Acompanhar e simular leituras**
- Você será redirecionado para a tela de detalhe da cura
- Use os botões de simulação para registrar leituras:
  - **Leitura normal** — temperatura e nível normais
  - **Temperatura alta** — simula tanque aquecido, dispara alerta vermelho
  - **Nível baixo** — simula queda no nível da água, dispara alerta amarelo
  - **Normalizar** — volta tudo ao estado normal
- Observe a linha do tempo e o histórico de leituras sendo preenchidos

**5. Explorar o simulador**
- Acesse **Simulador** no menu lateral
- Selecione a cura ativa e experimente os controles manuais de temperatura e nível

---

## 🔌 Arquitetura futura com ESP32

Na Fase 2, o fluxo de dados seguirá esta arquitetura:

```
┌─────────────────────────────────────────────────────┐
│                    Tanque de Cura                   │
│                                                     │
│   [DS18B20]      [HC-SR04]      [DHT22]             │
│   temp. água     nível água     temp. ambiente      │
│       │               │               │             │
│       └───────────────┴───────────────┘             │
│                        │                            │
│                    [ ESP32 ]                        │
│              (leitura + buffer circular)            │
└────────────────────────┬────────────────────────────┘
                         │ publica via MQTT
                         ▼
                  [ Broker MQTT ]
                  (ex: Mosquitto)
                         │ assina tópico
                         ▼
               [ Dashboard CuraSense ]
               (Next.js + API Route)
                         │
                         ▼
               [ localStorage / banco ]
               histórico · alertas · gráficos
```

Cada leitura publicada pelo ESP32 terá o formato:

```json
{
  "curaId": "abc123",
  "temperaturaTanque": 22.4,
  "temperaturaAmbiente": 25.1,
  "nivelAguaTanque": "ok",
  "dataHora": "2025-09-10T14:32:00Z"
}
```

O dashboard assina o tópico `curasense/leituras/{curaId}` e persiste cada mensagem recebida no histórico da cura correspondente.

---

## 🏁 Conclusão

O CuraSense começou como uma ideia genérica de controle de irrigação e evoluiu para algo bem mais concreto — literalmente. A conversa com a fabricante de peças UHPC foi o que transformou o projeto de exercício acadêmico em algo com aplicação real.

Ao longo do desenvolvimento, aprendemos a separar bem as camadas do sistema (tipos, serviços, interface), a projetar um modelo de dados que reflete um processo real de produção, e a pensar na integração entre software e hardware desde o início — mesmo que o hardware ainda esteja na fase de planejamento.

A parte que achamos mais interessante do ponto de vista de sistemas embarcados foi a discussão sobre **buffer circular**: entender por que uma estrutura de dados com memória fixa e acesso O(1) faz mais sentido em microcontroladores do que uma lista dinâmica muda a forma de pensar sobre recursos limitados em hardware.

Este protótipo é uma Fase 1. Tem muito ainda a ser feito: integração real com o ESP32, sensores físicos no tanque, MQTT em funcionamento. Mas a base está montada de forma que a Fase 2 seja uma extensão natural — não uma reescrita.

---

> Projeto desenvolvido como protótipo acadêmico experimental para fins de aprendizado.  
> Não deve ser utilizado como único critério de controle de qualidade em produção industrial.
