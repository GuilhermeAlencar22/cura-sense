# CuraSense

### Sistema de Monitoramento de Traço e Cura de Peças de Concreto UHPC

> Protótipo acadêmico desenvolvido para a disciplina de **Sistemas Embarcados** — César School, 2025.2  
> Professores: Bella Nunes · Jymmy Barreto

---

## Integrantes

| Nome |
|------|
| Guilherme Alencar |
| Henrique Lobo |
| João Victor Nunes |
| Caio Fonseca |
| Rodrigo Leal |

---

## Sobre o projeto

Durante a disciplina, precisávamos propor um problema real para desenvolver um sistema de monitoramento com ESP32 e telemetria. A ideia inicial era trabalhar com controle de irrigação, mas depois de pesquisar mais, chegamos a um contexto bem mais específico.

Entramos em contato com uma fabricante real de peças decorativas em concreto UHPC — cubas para banheiro, escalda-pés, pias gourmet. Numa entrevista com ela, percebemos que o problema central não era a irrigação em si, mas algo mais específico: **a falta de padronização no processo de produção e cura das peças**.

Ela relatou que perde peças por trincas com frequência — especialmente em geometrias finas como escalda-pés. A causa mais provável é a variação na dosagem dos insumos e no processo de cura. O traço do UHPC é muito sensível: uma variação pequena na relação água/cimento já pode comprometer a resistência e a aparência final da peça.

O controle era feito de forma manual, em anotações, sem rastreabilidade de lote para lote. Não era possível saber, por exemplo, se a peça que trincou usou mais água que o padrão, ou se ficou menos tempo no tanque.

A partir daí, o projeto tomou forma: um sistema que registra receitas de traço, acompanha a dosagem real de cada lote, compara com o padrão, e monitora o processo de cura com sensores integrados ao ESP32.

---

## Objetivo

Desenvolver um sistema embarcado e dashboard web que permita:

- registrar e padronizar receitas de traço de concreto UHPC;
- comparar a dosagem real de cada lote com o traço padrão;
- acompanhar o processo de cura com monitoramento em tempo real via ESP32;
- controlar a microbomba de irrigação remotamente pelo dashboard;
- visualizar histórico de lotes, leituras e conformidade de dosagem.

---

## Arquitetura do sistema

```
┌─────────────────────────────────────────────┐
│              Câmara / Tanque de Cura        │
│                                             │
│          [DHT22]            [Microbomba]    │
│      temp · umidade           irrigação     │
│              │                    ▲         │
│              └────────────────────┘         │
│                        │                   │
│                   [ ESP32 ]                 │
│           WiFi + MQTT + ring buffer         │
└────────────────────────┬────────────────────┘
                         │ publica / assina MQTT
                         ▼
              [ Broker Mosquitto ]
              porta 1883 (ESP32)
              porta 9001 (WebSocket)
                         │
                         ▼
            [ Dashboard CuraSense ]
              Next.js · mqtt.js
           recebe leituras em tempo real
           envia comandos ao ESP32
```

### Tópicos MQTT

| Tópico | Direção | Conteúdo |
|--------|---------|----------|
| `curasense/{curaId}/sensor/dht22` | ESP32 → Dashboard | temperatura e umidade |
| `curasense/{curaId}/atuador/bomba` | ESP32 → Dashboard | estado da bomba e volume irrigado |
| `curasense/{curaId}/controle/bomba` | Dashboard → ESP32 | comando ligar/desligar |
| `curasense/{curaId}/controle/modo` | Dashboard → ESP32 | `automatico` ou `manual` |
| `curasense/{curaId}/config` | Dashboard → ESP32 | parâmetros de irrigação |
| `curasense/{curaId}/alerta` | ESP32 → Dashboard | alertas de desvio |
| `curasense/sistema/heartbeat` | ESP32 → Dashboard | status de conexão a cada 10s |
| `curasense/sistema/activeCura` | Dashboard → ESP32 | define qual cura está ativa |

---

## Tecnologias

### Frontend
| Tecnologia | Uso |
|---|---|
| Next.js 16 | Framework React com App Router |
| TypeScript | Tipagem estática |
| mqtt.js | Cliente MQTT over WebSocket |
| CSS Modules | Estilização sem dependências externas |
| localStorage | Persistência local de receitas, lotes e histórico |

### Firmware ESP32
| Tecnologia | Uso |
|---|---|
| PlatformIO + Arduino framework | Build e upload |
| DHT sensor library | Leitura de temperatura e umidade |
| PubSubClient | Cliente MQTT |
| Ring buffer (C++) | Armazenamento de leituras durante desconexão |

### Infraestrutura
| Tecnologia | Uso |
|---|---|
| Mosquitto | Broker MQTT local |
| WebSocket (porta 9001) | Conexão do browser ao broker |

---

## Estrutura de pastas

```
cura-sense/
├── esp32-esp8266/
│   ├── platformio.ini
│   └── src/
│       ├── main.cpp             # Firmware: WiFi, MQTT, DHT22, bomba, ring buffer
│       ├── config.example.h     # Template de configuração (copie para config.h)
│       └── config.h             # Suas credenciais — NÃO commitado
│
├── applications/
│   └── frontend/
│       ├── src/
│       │   ├── app/             # Páginas (Next.js App Router)
│       │   │   ├── dashboard/
│       │   │   ├── receitas/
│       │   │   ├── producao/
│       │   │   ├── curas/
│       │   │   │   └── [id]/    # Detalhe da cura + controle MQTT em tempo real
│       │   │   ├── simulador/
│       │   │   ├── historico/
│       │   │   └── login/
│       │   ├── components/      # AppShell, Sidebar, StatCard, StatusBadge
│       │   ├── hooks/
│       │   │   └── useTelemetria.ts  # Hook de telemetria MQTT
│       │   ├── services/
│       │   │   ├── mqtt/
│       │   │   │   ├── mqttClient.ts    # Singleton WebSocket
│       │   │   │   └── mqttTopics.ts    # Definição de tópicos
│       │   │   ├── curasService.ts
│       │   │   ├── lotesService.ts
│       │   │   └── receitasService.ts
│       │   └── types/index.ts   # Tipos: payloads MQTT, domínio, telemetria
│       └── .env.local           # NEXT_PUBLIC_MQTT_WS_URL — NÃO commitado
│
├── mosquitto.conf               # Config do broker (portas 1883 + 9001 WebSocket)
├── docs/
└── schematics/
```

---

## Como executar

### Pré-requisitos

- Node.js 18+
- PlatformIO (extensão VSCode)
- Mosquitto instalado (`brew install mosquitto` no Mac)

---

### 1. Broker MQTT

```bash
mosquitto -c mosquitto.conf
```

Deixe rodando em um terminal. Ele escuta na porta `1883` (ESP32) e `9001` (browser).

---

### 2. Firmware ESP32

**Copie o arquivo de configuração:**
```bash
cp esp32-esp8266/src/config.example.h esp32-esp8266/src/config.h
```

**Edite `config.h`** com suas credenciais:
```c
#define WIFI_SSID     "SUA_REDE"
#define WIFI_PASSWORD "SUA_SENHA"
#define MQTT_HOST     "192.168.1.X"  // IP do PC com Mosquitto
```

Abra a pasta `esp32-esp8266/` no VSCode com PlatformIO, compile e faça o upload para o ESP32.

O firmware vai:
- conectar no WiFi e no broker
- aguardar o dashboard definir qual cura está ativa
- publicar leituras do DHT22 a cada 3 segundos
- responder comandos de ligar/desligar bomba
- enviar heartbeat a cada 10 segundos

---

### 3. Dashboard

```bash
cd applications/frontend
```

Crie o arquivo `.env.local`:
```
NEXT_PUBLIC_MQTT_WS_URL=ws://localhost:9001
```

Instale as dependências e rode:
```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

---

### Fluxo completo

1. Entre com qualquer e-mail (login simulado)
2. Crie uma receita de traço em **Receitas → Nova Receita**
3. Registre um lote em **Produção → Novo Lote**, comparando dosagem real com o padrão
4. Inicie a cura pelo lote registrado
5. Abra o **detalhe da cura** — o dashboard detecta automaticamente o ESP32 quando ele conectar ao broker
6. As leituras de temperatura e umidade aparecem em tempo real
7. Use os botões para ligar a bomba manualmente ou alternar entre modo automático e manual

---

## Lógica de conformidade de dosagem

Ao registrar um lote, o sistema compara a dosagem real com a receita padrão e calcula:

| Desvio | Classificação |
|--------|---------------|
| ≤ 3% | Conforme |
| ≤ 8% | Desvio leve |
| > 8% | Desvio crítico |

Os desvios calculados são: relação água/cimento (A/C) e relação cimento/agregado.

---

## Ring buffer no firmware

O ESP32 armazena até 20 leituras localmente em um ring buffer de tamanho fixo. Se a conexão MQTT cair, as leituras continuam sendo registradas. Quando a conexão é restabelecida, o firmware drena o buffer e envia todas as leituras acumuladas.

| Operação | Array dinâmico | Ring buffer |
|---|---|---|
| Inserir nova leitura | O(1) amortizado | O(1) |
| Remover a mais antiga | O(n) | O(1) |
| Uso de memória | Cresce indefinidamente | Fixo (20 entradas) |

Para um microcontrolador com 520 KB de SRAM como o ESP32, memória fixa e acesso previsível são requisitos práticos, não apenas teóricos.

---

## Parte acadêmica

Este projeto cobre os seguintes conceitos da disciplina:

**Sistemas embarcados:** firmware em C++ com leitura de sensor DHT22, controle de atuador (bomba), estrutura de dados com ring buffer e gerenciamento de reconexão WiFi/MQTT.

**Protocolo IoT:** arquitetura publisher/subscriber com MQTT, tópicos separados por função (sensor, atuador, controle, config, heartbeat), comunicação bidirecional entre ESP32 e dashboard.

**Integração software/hardware:** contrato de mensagens definido em TypeScript (`types/index.ts`) e implementado no firmware em C++. Os tipos `PayloadDHT22`, `PayloadBomba`, `ComandoBomba` e `PayloadHeartbeat` documentam o protocolo dos dois lados.

**Problema real:** o sistema foi desenhado a partir de uma entrevista com uma fabricante real de peças UHPC, não de um enunciado genérico.

---

> Projeto desenvolvido como protótipo acadêmico experimental.  
> Não deve ser utilizado como único critério de controle de qualidade em produção industrial.
