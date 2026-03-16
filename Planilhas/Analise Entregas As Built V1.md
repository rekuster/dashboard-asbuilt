# Análise Entregas As Built — V1
**Data:** 13/03/2026  
**Projeto:** NEO-23001

---

## Resumo Executivo

Análise completa das entregas As-Built recebidas, cruzando os dados da aba "Mapeamento Entrega As Built" com o "Mapeamento Modelos As Built" (escopo dos 114 modelos), o "Controle de Entregas" da THA e o BEP (item 12). O objetivo é entender o estado atual das entregas, identificar problemas, ações pendentes e definir como estruturar o fluxo no dashboard.

---

## 1. Diretrizes do BEP (Item 12) — Resumo das Regras

### O que o BEP define:

| Aspecto | Diretriz |
|---|---|
| **Formato de entrega** | Nativo `.rvt` (Revit) — obrigatório |
| **Parâmetros obrigatórios** | `STC_Status` (executado conforme ou com alteração) e `STC_Descrição de Alteração` |
| **Frequência — THA** | Mensal (Civil, Hidrossanitário, SPDA) |
| **Frequência — OCLE** | Quinzenal (Instalações) |
| **Onde publicar** | Stecla Cloud (GED) — pasta exclusiva As Built |
| **Responsabilidade de validação** | Coordenação BIM (Renata Küster / Gabriel Moura) |
| **Nomenclatura** | Padrão item 10.6 do BEP + data de entrega na descrição |

### Fluxo definido no BEP:
1. Coleta de informações de campo (equipe de obra)
2. Atualização do modelo (modelador — parâmetros `STC_Status` e `STC_Descrição de Alteração`)
3. Validação interna (conferência geométrica e de informações)
4. Publicação no Stecla Cloud
5. Aprovação final (equipe BIM)

### Responsabilidades:

| Papel | Responsável | O que faz |
|---|---|---|
| Coordenação BIM | Renata Küster | Validar modelos, consolidar entregas, controlar versões, garantir conformidade BEP |
| Validação dos Modelos | Gabriel Moura | Validação técnica dos modelos |
| Modelador BIM — THA | Ronan Brys Völz | Atualizar elementos conforme execução (Civil, HID, SPDA) |
| Modelador BIM — OCLE | Celso Cruz | Atualizar elementos conforme execução (Instalações) |
| Equipe de Obra | — | Fornecer informações de campo |

---

## 2. Panorama Geral das Entregas Registradas

### Responsáveis e Edificações

| Responsável | Edificações | Entregas Registradas | Tipo Principal | Frequência (BEP) |
|---|---|---|---|---|
| **OCLE** | Prédio Produção, Prédio Suporte | 43 itens (9 SMs: SM17 a SM33) | RVT (modelos) ✅ | Quinzenal |
| **AeB** | ETE, Sede Recreativa | ~75 itens (7 entregas) | DWG, PDF, IFC ⚠️ | Por demanda |
| **THA** | Todas (coord. geral) | ~35 itens (controle separado) | RVT | Mensal |

> **Nota:** A AeB não é mencionada no BEP item 12. Suas entregas seguem um padrão diferente (DWG/IFC em vez de RVT nativo), o que gera necessidade de ações adicionais.

### Linha do Tempo — OCLE (Entregas Parciais Quinzenais)

| SM | Data | Disciplinas Entregues | Edificações |
|---|---|---|---|
| SM 17 | 24/04/2025 | ELE, LOG, PCI | Produção |
| SM 18 | 30/04/2025 | ELE, PCI | Produção |
| SM 21 | 22/05/2025 | ELE, LOG, PCI, CLI, SDA | Produção |
| SM 23 | 05/06/2025 | ELE (Prod+Sup), PCI, CLI, UTI, SDA | Produção, Suporte |
| SM 25 | 19/06/2025 | PCI, CLI, UTI | Produção |
| SM 27 | 03/07/2025 | ELE, LOG, PCI, CLI (Prod+Sup), UTI, SDA | Produção, Suporte |
| SM 29 | 17/07/2025 | ELE, PCI, CLI | Produção |
| SM 31 | 31/07/2025 | ELE, PCI×2, CLI (Prod+Sup), SDA + 2 DWG Sala Limpa | Produção, Suporte |
| SM 33 | 14/08/2025 | ELE (Sup), LOG (Sup), CLI, UTI, SDA (Prod+Sup) | Produção, Suporte |

> **Pendência:** Faltam ~15 entregas da OCLE para cadastrar + todas as entregas da THA.

### Linha do Tempo — AeB (ETE + Sede Recreativa)

| # Entrega | Data | Edificação | Qtd Itens | Destaques |
|---|---|---|---|---|
| 1ª | 04/12/2025 | ETE + Sede | 5 + 9 | Primeiro IFC concreto (sem fundações), dwg locação, relatório |
| 2ª | 18/12/2025 | ETE + Sede | 1 + 11 | Relatório compatibilização; IFC Sede com problemas nos blocos |
| 3ª | 15/01/2026 | ETE + Sede | 15 + 6 | Muitas pranchas metálica, IFC Sede R02 (sem blocos) |
| 4ª | 30/01/2026 | ETE + Sede | 14 + 3 | IFC fabricação metálica, databook 20 pranchas Sede, CLI Sede faltou modelo |
| 5ª | 12/02/2026 | ETE + Sede | 6 + 1 | Fundações Sala Sopradores, marquise em desenvolvimento |
| 6ª | 26/02/2026 | ETE + Sede | 2 + 1 | Insertos e chapas, databook 4 pranchas. **Faltou relatório** |
| 7ª | 12/03/2026 | ETE + Sede | 2 + 1 | ARQ compatib. pré-moldada, databook 18 pranchas. **Faltou relatório** |

---

## 3. Problemas e Padrões Identificados

### 🔴 Problemas Críticos

| # | Problema | Entregas Afetadas | Ação Necessária |
|---|---|---|---|
| 1 | **AeB entrega apenas IFC/DWG, sem RVT** (BEP exige .rvt) | ETE Concreto, Sede Concreto, Metálica | Solicitar RVT atualizado |
| 2 | **Modelos IFC da Sede com falhas recorrentes** | R01 (blocos errados), R02 (sem blocos), R03 (sem blocos) | Cobrar ajuste |
| 3 | **Fundações não modeladas** (ETE e Sede) | Ambas edificações | Modelar internamente ou cobrar |
| 4 | **Relatórios faltando** nas últimas entregas AeB | 6ª e 7ª entrega | Cobrar retroativamente |
| 5 | **Pranchas repetidas** entre entregas Sede | Databooks 4ª a 7ª | Identificar versão final |

### 🟡 Pontos de Atenção

| # | Observação | Detalhes |
|---|---|---|
| 1 | **Modelo base com revisão diferente do mapeamento** | OCLE usa revisões mais antigas (ex: R03) vs mapeamento (R08) — projeto sofreu alterações |
| 2 | **Nomenclatura inconsistente (AeB)** | OCLE segue padrão; AeB usa nomes de fabricação (ex: `63B-CHE1_R00`) |
| 3 | **DWG Sala Limpa (CLI)** | 2 pranchas na SM31 — avaliar se deve modelar |
| 4 | **Metálica AeB: modelo de fabricação** | 4ª entrega trouxe IFC de fabricação, não modelo de projeto |
| 5 | **Parâmetros STC_Status e STC_Descrição** | Verificar se entregas OCLE/THA estão preenchendo esses parâmetros |
| 6 | **Arquitetura ETE: caimento laje alterado** | 4ª entrega — verificar modelo ARQ |

### 🟢 O que está funcionando bem

- OCLE: Entregas quinzenais regulares (conforme BEP)
- OCLE: Formato .rvt consistente (conforme BEP)
- OCLE: Modelo final definido para cada disciplina
- OCLE: Cobertura de disciplinas crescente a cada entrega

---

## 4. Cruzamento: Entregas vs Escopo (114 modelos)

### Escopo OCLE — Prédio Produção (28 modelos)

| Disciplina | Modelo Final Esperado | Entregas Parciais? | Obs |
|---|---|---|---|
| Inst. Elétricas | AS-ELE-001-PROD1-R00 | ✅ 7 entregas | Em andamento |
| CFTV e Lógica | AS-LOG-001-PROD1-R00 | ✅ 3 entregas | Em andamento |
| PCI (Hidrantes) | AS-PCI-001-PROD1-R00 | ✅ 7 entregas | Em andamento |
| PCI (Sprinklers) | AS-PCI-002-PROD1-R00 | ✅ 1 entrega | Em andamento |
| Climatização | AS-CLI-001-PROD1-R00 | ✅ 6 entregas | Em andamento |
| Utilidades | AS-UTI-001-PROD1-R00 | ✅ 3 entregas | Em andamento |
| SDAI | AS-SDA-001-PROD1-R00 | ✅ 5 entregas | Em andamento |
| Arquitetura | AS-ARQ-001-PROD1-R00 | ❌ | Aguardando (THA) |
| Estr. Concreto | AS-CON-001-PROD1-R00 | ❌ | Aguardando (THA) |
| Estr. Metálica | AS-MET-001-PROD1-R00 | ❌ | Aguardando (THA) |
| Hidrossanitário | AS-HID-001/002-PROD1-R00 | ❌ | Aguardando (THA) |
| Piso de Concreto | AS-PIS-001/002-PROD1-R00 | ❌ | Aguardando (THA) |
| SPDA | AS-SPD-001-PROD1-R00 | ❌ | Aguardando |

### Escopo AeB — ETE (12 modelos)

| Disciplina | Modelo Final Esperado | Entregas? | Problema |
|---|---|---|---|
| Estr. Concreto | AS-CON-001-ETE1-R00 | ⚠️ Só IFC | Sem RVT, sem fundações |
| Estr. Metálica | AS-MET-001-ETE1-R00 | ⚠️ Só IFC fabric. | Pedir RVT |
| Arquitetura | AS-ARQ-001-ETE1-R00 | ⚠️ DWG/PDF | Verificar modelo |
| Drenagem | AS-DRE-001-ETE1-R00 | ⚠️ Proposta alter. | Ajustar modelo |
| Demais | — | ❌ | Aguardando |

### Escopo AeB — Sede Recreativa (11 modelos)

| Disciplina | Modelo Final Esperado | Entregas? | Problema |
|---|---|---|---|
| Estr. Concreto | AS-CON-001-SEDE1-R00 | ⚠️ IFC com falhas | R01/R02/R03 sem blocos |
| Climatização | AS-CLI-001-SEDE1-R00 | ⚠️ Só DWG | Pedir RVT |
| Demais | — | ❌ | Aguardando |

---

## 5. Proposta para o Dashboard — Fluxo e Campos

### 5.1 Estrutura de Dados da Entrega

```
ENTREGA (pacote de documentos)
├── Identificador (ex: "SM 33", "3ª Entrega ETE")
├── Data da Entrega
├── Responsável (OCLE, AeB, THA)
├── Edificação
├── Itens Entregues (lista):
│   ├── Nome do Arquivo
│   ├── Disciplina
│   ├── Formato (RVT, IFC, DWG, PDF)
│   ├── É Modelo? (Sim/Não)
│   ├── Modelo Base Referência
│   └── Observações
├── Verificação:
│   ├── Status (Pendente → Em Verificação → Verificada)
│   ├── Data da Verificação
│   ├── Resultado (Conforme / Não Conforme / Parcialmente Conforme)
│   └── Checklist BEP:
│       ├── Formato .rvt? 
│       ├── STC_Status preenchido?
│       ├── STC_Descrição de Alteração preenchido?
│       ├── Nomenclatura conforme item 10.6?
│       └── Publicado no Stecla Cloud?
├── Ações Necessárias:
│   ├── Tipo (Solicitar RVT, Modelar, Cobrar relatório, etc.)
│   ├── Status (Pendente / Em andamento / Concluída)
│   └── Data Conclusão
├── Avanços por Pavimento/Sala (para OCLE)
└── Comentários/Histórico
```

### 5.2 Fluxo de Status

```
Entregue → Pendente Verificação → Em Verificação → Resultado:
  ├── Conforme BEP → Validado ✅
  ├── Não Conforme → Rejeitado → Retorno ao projetista → Aguardando Reentrega
  └── Parcialmente Conforme → Validado com Ressalvas → Ações em Andamento
```

### 5.3 Campos Novos vs. Dashboard Atual

| Campo Novo | Por quê | Origem |
|---|---|---|
| Data da Entrega (real) | Registrar quando recebeu | Planilha "Data" |
| Data da Verificação | Medir tempo de verificação | Necessidade operacional |
| Identificador da Entrega | Agrupar itens por SM/entrega | Planilha "Entrega" |
| Formato do Arquivo | RVT vs IFC vs DWG vs PDF — impacta ações | Planilha "Formato" |
| É Modelo? (Sim/Não) | Diferenciar modelos BIM de pranchas | Planilha "Modelo?" |
| Ações Geradas | Rastrear pendências | Planilha "Ação" |
| Avanços por Pavimento/Sala | Controle progressivo OCLE | Sugestão Renata |
| PARCIALMENTE_CONFORME | Quando tem partes OK e partes com pendência | Comum nas entregas AeB |
| Checklist BEP | Verificar conformidade com diretrizes | BEP item 12 |
| Modelo Base de Referência | Base muda entre entregas | Planilha "Modelo Base" |

### 5.4 Visões Sugeridas

1. **Por Entrega (pacote)** — Cada SM/entrega como card expansível
2. **Por Disciplina (escopo)** — Progresso de cada modelo do escopo
3. **Pendências/Ações** — Lista filtrada por responsável e tipo
4. **Timeline** — Evolução temporal por modelo/disciplina

---

## 6. Lista de Ações Imediatas

### AeB — ETE

| # | Ação | Prioridade |
|---|---|---|
| 1 | Solicitar RVT de concreto (todas entregas foram IFC) | 🔴 Alta |
| 2 | Solicitar RVT de metálica atualizado (pipe rack) | 🔴 Alta |
| 3 | Cobrar relatório 6ª e 7ª entregas | 🟡 Média |
| 4 | Verificar caimento da laje no modelo ARQ | 🟡 Média |
| 5 | Modelar fundações Sala Sopradores | 🟡 Média |
| 6 | Solicitar metálica steel deck atualizado (BAM-002.01) | 🟡 Média |

### AeB — Sede Recreativa

| # | Ação | Prioridade |
|---|---|---|
| 1 | Solicitar RVT de concreto (IFC sempre com falhas) | 🔴 Alta |
| 2 | Solicitar RVT de climatização | 🔴 Alta |
| 3 | Modelar fundações para as-built | 🟡 Média |
| 4 | Identificar versão final de cada prancha (repetições) | 🟡 Média |

### OCLE

| # | Ação | Prioridade |
|---|---|---|
| 1 | Cadastrar as 15 entregas faltantes no mapeamento | 🟡 Média |
| 2 | Verificar as 9 SMs registradas | 🟡 Média |
| 3 | Registrar avanço por pavimento/sala ao verificar | 🟢 Ao verificar |

### THA

| # | Ação | Prioridade |
|---|---|---|
| 1 | Cadastrar entregas da THA no mapeamento | 🟡 Média |

---

## 7. Próximos Passos

1. ✅ Análise V1 concluída
2. ⏳ Renata continua alimentando a planilha com as entregas faltantes (OCLE + THA)
3. ⏳ Quando planilha estiver completa → implementar alterações no dashboard:
   - Novos campos no cadastro de entregas
   - Nova vista "Por Entrega" (pacotes)
   - Checklist BEP na verificação
   - Vista de Ações/Pendências
   - Importar dados da planilha
