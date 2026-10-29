# Painel Executivo de Comando e Controle de Missões Operacionais

Um dashboard executivo tático em tema escuro militar moderno para monitoramento georreferenciado, controle de execução em tempo real e gestão operacional de missões em todo o território nacional, com suporte nativo a operação offline e sincronização via arquivos CSV.

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram consolidadas e atualizadas conforme suas orientações mais recentes para orientar a construção do painel.

- **Disposição Espacial do Painel (Layout Executivo Lado a Lado)**:
  - **Topo**: Barra Executiva (com botão **Novo Registro**, Importar/Exportar CSV, Limpar Registros e status Online/Offline), seguida pela faixa de KPIs exibindo o total geral de missões e os 5 cards filtráveis por status, e pela barra de filtros táticos (incluindo filtro por intervalo de datas).
  - **Centro-Esquerda**: Mapa interativo Leaflet com marcadores georreferenciados e coloridos por status.
  - **Centro-Right (Centro-Direita)**: Painel rolável de cards interativos agrupados por **Local**, lado a lado com o mapa para correlação visual imediata.
- **Categorias Oficiais de Status e Regras de Cores**:
  - **Em Planejamento**: Amarelo (`#EAB308`)
  - **Agt Execução** (ou *Agd Execução*): Cinza (`#94A3B8`)
  - **Em Andamento**: Verde (`#10B981`)
  - **Finalizada**: Azul (`#38BDF8`)
  - **Cancelada**: Vermelho (`#EF4444`)
- **Campo `Ação` Restrito a Siglas Operacionais**: O campo **Ação** será padronizado com as opções **PA**, **CI**, **SI**, **ADS**, **DAAE** e **OPESP** (com seletor dedicado no cadastro/edição, filtro na barra de ferramentas e normalização na importação CSV).
- **Campo `Indenização` (Tipo de Indenização)**: Campo do tipo texto restrito às opções **NIL**, **DIÁRIA** e **GRAT REP**, sem finalidade de soma orçamentária.
- **Filtro por Data**: Inclusão de filtro de período (**Data Início** e **Data Término**) na barra de controle para filtrar missões vigentes ou compreendidas no intervalo selecionado.
- **Obtenção Automática e Seleção no Mapa de `Lat` / `Lng` + Novo Registro / Limpeza Geral**: Botão **"Novo Registro"** em destaque na Barra Executiva abrindo o modal com geocodificação automática ao informar o **Local** (catálogo offline de localidades/bases + busca online) e seleção por clique em mapa, além de botão **"Limpar Registros"** para esvaziar toda a base.

---

## 1. Overview & Core Concept

- **O Que Faz**: Centraliza o acompanhamento de missões operacionais em uma tela de comando dividida de alta eficiência: Barra Executiva e KPIs de status no topo, mapa tático interativo à esquerda e grupos de localidades com suas missões à direita.
- **Público-Alvo / Persona**: Oficiais de Estado-Maior, coordenadores de operações (COMAE / Centros de Operações) e gestores operacionais que necessitam de consciência situacional imediata, controle de efetivo empregado (`Qtd Militares`, `Fração de Tropa`), filtro cronológico e enquadramento de ações (`PA`, `CI`, `SI`, `ADS`, `DAAE`, `OPESP`) e indenizações (`NIL`, `DIÁRIA`, `GRAT REP`) mesmo em ambientes com conectividade instável.
- **Valor Principal**: Elimina a dispersão de dados em planilhas estáticas ao transformar a estrutura padrão de 13 colunas em um centro de comando visual, interativo e resiliente a quedas de conexão.

---

## 2. User Experience & Visual Design

### Fluxos Principais do Usuário
1. **Consciência Situacional em Tela Única (Topo + Centro-Esquerda + Centro-Direita)**:
   - **Topo**: Barra Executiva contendo o botão primário **Novo Registro**, controles de Importar/Exportar CSV, Limpar Registros e indicador Online/Offline; seguida pelos cards de KPI (Total de Missões + 5 Status com suas cores oficiais) e barra de filtros rápidos (com filtro por período de datas).
   - **Centro-Esquerda**: Mapa tático Leaflet ocupando a metade esquerda da área principal, exibindo os pinos das missões agrupados/coloridos por status.
   - **Centro-Direita**: Coluna estruturada à direita contendo os cards agrupados por **Local**, permitindo inspecionar e gerenciar as missões de cada localidade sem perder o mapa de vista.
2. **Filtragem Cruzada (KPIs, Intervalo de Datas, Ação, Busca e Mapa)**:
   - **Filtro por Status (KPIs)**: Clicar em qualquer card de KPI no topo filtra instantaneamente tanto o mapa à esquerda quanto os cards de locais à direita.
   - **Filtro por Data**: Campos de intervalo (`De: Data Início` — `Até: Data Término`) que filtram todas as missões cujo período de execução (`Data início` a `Data término`) intercepte o intervalo informado, com botão rápido para limpar o período.
   - **Filtros Táticos Adicionais**: Busca textual livre, seletor por **Ação** (`PA`, `CI`, `SI`, `ADS`, `DAAE`, `OPESP`), por **Operação** e por **Indenização** (`NIL`, `DIÁRIA`, `GRAT REP`).
   - **Sincronia Mapa ↔ Cards**: Selecionar um pino no mapa à esquerda destaca e rola automaticamente até o card do respectivo Local à direita; clicar em "Focar no Mapa" no card à direita executa zoom tático (`flyTo`) no mapa à esquerda.
3. **Gestão Direta nos Cards Agrupados por Local (Centro-Direita)**:
   - Cada grupo de **Local** exibe no cabeçalho o nome da localidade, coordenadas geográficas em fonte monoespaçada tabular, total de missões alocadas e efetivo total mobilizado (`Qtd Militares`).
   - Cada missão dentro do local apresenta: **Missão**, **Operação**, **Unidade Executora**, sigla da **Ação** (`PA`, `CI`, `SI`, `ADS`, `DAAE`, `OPESP`), **Fração de Tropa**, período (**Data início** a **Data término**), **Qtd Militares**, modalidade de **Indenização** (`NIL`, `DIÁRIA`, `GRAT REP`) e seletor rápido de **Status**.
4. **Novo Registro / Edição com Geocodificação e Mapa Seletor + Limpeza Geral**:
   - Clicar em **"Novo Registro"** na Barra Executiva abre o modal de missão. Ao preencher o **Local**, o sistema sugere/busca automaticamente a `Lat` e `Lng` (via base offline de cidades/bases militares brasileiras + API Nominatim quando online), além de oferecer um mini-mapa interativo para clique direto no ponto desejado.
   - Botão **"Limpar Registros"** na Barra Executiva com confirmação de segurança para zerar todas as missões e o cache local quando necessário.

### Identidade Visual & Tema (Dark Militar Moderno)
- **Direção Estética**: Utilitário Tático Executivo — sóbrio, de alta legibilidade, inspirado em centros modernos de comando e controle aeroespacial/defesa.
- **Paleta de Cores (Disciplina 60-30-10 & Semântica Oficial de Status)**:
  - **60% Superfície Dominante (Canvas)**: Ardósia Militar Profunda (`#0B0F0E` / `#0F1513`) para fundo principal.
  - **30% Superfícies Estruturais**: Verde-Oliva Escuro Acinzentado (`#151D1A` / `#1C2623`) para cards de camada única com bordas sutis de `1px` (`#263530`) e texto secundário em cinza claro (`#94A39E`).
  - **10% Orçamento de Acento & Cores de Status Definidas**:
    - **Em Planejamento**: Amarelo (`#EAB308` / `amber-400`)
    - **Agt Execução**: Cinza (`#94A3B8` / `slate-400`)
    - **Em Andamento**: Verde (`#10B981` / `emerald-500`)
    - **Finalizada**: Azul (`#38BDF8` / `sky-400`)
    - **Cancelada**: Vermelho (`#EF4444` / `red-500`)
- **Tipografia & Hierarquia (Regra 2+1 Fontes)**:
  - *Display & Cabeçalhos Táticos*: `Barlow Condensed` (SemiBold/Bold) para títulos de seção, cabeçalhos de operações e contadores de KPI.
  - *Corpo & Leitura Densa*: `Public Sans` para leitura limpa de unidades executoras e metadados operacionais.
  - *Dados, Datas, Coordenadas & Efetivo*: `JetBrains Mono` com `font-variant-numeric: tabular-nums` obrigatório para `Lat`, `Lng`, datas, `Qtd Militares` e contadores numéricos.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Layout Split-Screen no Centro (Mapa à Esquerda + Cards por Local à Direita)**
  - *Abordagem Escolhida*: Em telas desktop, após a Barra Executiva, faixa de KPIs e barra de filtros no topo, o espaço principal é dividido em duas colunas balanceadas (`grid-cols-12`, sendo 6 ou 7 colunas para o Mapa Leaflet fixo à esquerda e 6 ou 5 colunas para a lista rolável de Cards agrupados por Local à direita).
  - *Por quê*: Permite que o comandante ou operador clique em qualquer pino no mapa e veja imediatamente os detalhes das missões daquele local ao lado, sem precisar rolar a página para cima e para baixo.
- **Decisão 2: Geocodificação Híbrida + Padronização Estrita de `Ação` e `Indenização`**
  - *Abordagem Escolhida*: Restrição dos seletores de **Ação** (`PA`, `CI`, `SI`, `ADS`, `DAAE`, `OPESP`) e **Indenização** (`NIL`, `DIÁRIA`, `GRAT REP`) no modal acionado pelo botão **Novo Registro** / Edição, mantendo compatibilidade e normalização automática ao importar arquivos `.csv`.

---

## 4. Technical Architecture & Data Strategy

### Arquitetura e Disposição Espacial de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CAMADA DE PERSISTÊNCIA & GEOCODIFICAÇÃO                   │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │ LocalStorage Engine  │  │ Parser / Export CSV  │  │ Geocoder Híbrido  │  │
│  │ (Save & Clear All)   │  │ (UTF-8, ; ou , BR)   │  │ (Offline + Mapa)  │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬─────────┘  │
└─────────────┼─────────────────────────┼────────────────────────┼────────────┘
              └─────────────────────────┼────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    TOPO                                     │
│  • Barra Executiva: [+ Novo Registro] | Importar/Exportar CSV |             │
│    Limpar Registros | Status de Rede (Online / Offline Cache)               │
│  • Cards de KPI por Status: Total | Em Planejamento (Amarelo) |             │
│    Agt Execução (Cinza) | Em Andamento (Verde) | Finalizada (Azul) |        │
│    Cancelada (Vermelho)                                                     │
│  • Barra de Filtros: Busca | Período (Data Início / Fim) | Ação | Operação  │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
┌─────────────────────────────────────┐   ┌───────────────────────────────────┐
│           CENTRO-ESQUERDA           │   │           CENTRO-DIREITA          │
│        MAPA TÁTICO LEAFLET          │   │    CARDS AGRUPADOS POR LOCAL      │
│  • Visual Dark Militar + Grade      │◄─►│  • Cabeçalho do Local (Lat/Lng,   │
│  • Pinos Coloridos conforme Status  │   │    Qtd Missões, Total Militares)  │
│  • Popup Tático com Resumo Local    │   │  • Cards de Missão Alocadas:      │
│  • Seleção Sincronizada com a       │   │    Ação (PA, CI, SI, ADS, DAAE,   │
│    Coluna da Direita                │   │    OPESP) e Indenização (NIL,     │
│                                     │   │    DIÁRIA, GRAT REP)              │
└─────────────────────────────────────┘   └───────────────────────────────────┘
```

### Modelo de Dados (13 Colunas Estruturadas)
Cada registro de missão segue fielmente a estrutura da planilha especificada:
- `id`: Identificador único interno
- `missao` (**Missão**): Código ou nome da missão (ex.: `MIS-2026-014`)
- `operacao` (**Operação**): Nome da operação maior (ex.: `Operação Ágata Fronteira Norte`)
- `local` (**Local**): Cidade/Base/Região de execução (ex.: `Boa Vista - RR`)
- `lat` (**Lat**): Latitude em graus decimais (`number`)
- `lng` (**Lng**): Longitude em graus decimais (`number`)
- `dataInicio` (**Data início**): Data de início da missão (`YYYY-MM-DD`)
- `dataTermino` (**Data término**): Data de término prevista/real (`YYYY-MM-DD`)
- `status` (**Status**): `'Em Planejamento'` (Amarelo) | `'Agt Execução'` (Cinza) | `'Em Andamento'` (Verde) | `'Finalizada'` (Azul) | `'Cancelada'` (Vermelho)
- `unidadeExecutora` (**Undidade Executora**): OM ou unidade responsável
- `acao` (**Ação**): `'PA'` | `'CI'` | `'SI'` | `'ADS'` | `'DAAE'` | `'OPESP'`
- `fracaoTropa` (**Fração de Tropa**): Pelotão, Esquadrão, Destacamento, Equipe, etc.
- `qtdMilitares` (**Qtd Militares**): Efetivo numérico empregado (`number`)
- `indenizacao` (**Indenização**): `'NIL'` | `'DIÁRIA'` | `'GRAT REP'`

### Mapeamento de Interações e Estados
- **Botão Novo Registro (Barra Executiva no Topo)**: Abre o modal para inserção manual de uma nova missão, com preenchimento automático de `Lat` e `Lng` conforme o `Local` informado ou seleção por clique no mini-mapa.
- **Filtro por Data (Período Operacional)**: Seletores de data inicial e final que filtram missões ativas no período (`dataInicio <= filtroFim` e `dataTermino >= filtroInicio`), atualizando KPIs, pinos no mapa (centro-esquerda) e cards por local (centro-direita).
- **Clique nos Cards de KPI de Status (Topo)**: Filtra instantaneamente os marcadores do mapa e os cards de locais pelo status escolhido.
- **Sincronização Mapa (Centro-Esquerda) ↔ Cards por Local (Centro-Direita)**: Clicar em um marcador no mapa seleciona e destaca o card do local na coluna da direita; clicar em um card de local à direita centraliza o mapa (`flyTo`) nas coordenadas correspondentes à esquerda.
- **Botão Limpar Registros**: Limpa a base ativa e o `localStorage` mediante confirmação, permitindo iniciar uma importação `.csv` limpa ou restaurar a carga de demonstração.
