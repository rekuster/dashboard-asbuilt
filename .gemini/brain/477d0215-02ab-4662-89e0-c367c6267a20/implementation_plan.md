# Plano de Implementação - Fluxo Global As-Built e Validação (v2)

Este plano organiza as entregas dos 108 modelos as-built, garantindo a rastreabilidade técnica (.rvt x .ifc) e o vínculo com as divergências de campo (apontamentos).

## Proposed Changes

### [Component Name] As-Built Validation & Checklist

#### [NEW] [ValidationTab.tsx](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/client/src/components/dashboard/ValidationTab.tsx)
- A new table view duplicating the DataHub structure but focused on As-Built model validation.
- Includes a "Checklist Modal" for each room to track discipline-level readiness.

### Dashboard
#### [MODIFY] [ValidationTab.tsx](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/client/src/components/dashboard/ValidationTab.tsx)
- Implementar mapeamento de normalização para edificações (Concluído).
- Adicionar contagem de apontamentos pendentes por disciplina na sala.

#### [MODIFY] [VerificationModal.tsx](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/client/src/components/dashboard/VerificationModal.tsx)
- Exibir indicação visual de divergências pendentes para cada disciplina na sala selecionada.

#### [MODIFY] [EntregasTab.tsx](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/client/src/components/dashboard/EntregasTab.tsx)
- [x] **Vínculo Checklist-Campo**: Busca divergências (`apontamentos`) por sala e disciplina para exibir alertas na verificação as-built.
- [x] **Gestão de Escopo (Plano RVT)**: Colunas extras para Nome Final do Modelo, se possui RVT Nativo e qual a ação para modelos sem RVT.
- [x] **Entrega em Lote**: Form de nova entrega agora permite selecionar múltiplas disciplinas de uma vez, registrando-as em lote.

### Dashboard Status
- [x] Dashboard de percentual validado para refletir os novos filtros e campos de RVT.

## Plano de Verificação

### Testes Manuais
1. **Checklist**: Abrir o modal de checklist em uma sala com divergências e verificar se o alerta âmbar aparece.
2. **Escopo**: Editar um item de escopo e definir "RVT Nativo = Não" e uma "Ação RVT", verificando se aparece na tabela.
3. **Entregas**: Criar uma nova entrega, selecionar uma edificação e marcar 3 check boxes de disciplinas. Verificar se 3 registros de entrega foram criados.

#### [MODIFY] [schema.ts](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/drizzle/schema.ts)
- Add a table (e.g., `verificacaoModelo`) to store per-room, per-discipline verification status and observations.

## 1. Importação e Controle Técnico (.rvt)
O script de importação lerá a aba `Mapeamento Modelos As Built` com foco no controle de arquivos:
- **Consolidação**: Agrupar múltiplos Modelos Base (Coluna D) em um único Modelo Final (Coluna J).
- **Rastreio RVT**: Identificar se o modelo possui .rvt nativo (Coluna F). Se não possuir, marcar para acompanhamento (pedir ao projetista ou gerar via IFC).
#### [NEW] [import-master-list.ts](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/import-master-list.ts)
- Baseado em `D:\STECLA IA\Dashboard-AsBuilt-Custom\Planilhas\Mapeamento RA-As Built.xlsx`.

## 2. Novo Dashboard: Status As-Built
Criação de uma visão separada da aba de Realidade Aumentada (RA) atual.
#### [NEW] [AsBuiltDashboard.tsx](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/client/src/components/dashboard/AsBuiltDashboard.tsx)
- KPIs de progresso das entregas (Total, Validados, Com Pendência).
- Gráfico de "Saúde dos Modelos" (Possui RVT vs. Pendente de RVT).
- Integração com a aba de Entregas existente.

## 3. Validação por Sala e Disciplina
#### [MODIFY] [DataHubTab.tsx](file:///d:/STECLA%20IA/Dashboard-AsBuilt-Custom/client/src/components/dashboard/DataHubTab.tsx)
- **Matriz de Validação**: Para facilitar a verificação das divergências nas 197 salas, ao abrir os detalhes de uma sala, o sistema mostrará quais disciplinas (modelos as-built) são necessárias para aquela edificação.
- Isso responderá à pergunta: "Para validar os pontos dessa sala, quais modelos as-built eu já tenho validados e quais faltam?".

## 4. Reconciliação com Planilha da Thá
- **Objetivo**: Cruzar os dados da planilha de controle externa (Planilha da Thá) com os registros internos.
- **Implementação**: No Dashboard As-Built, adicionar uma seção de "Divergências de Controle" que compara a coluna "Status" da planilha (ex: "POSTADO") com a existência de entregas validadas no sistema para aquela disciplina/edificação.
- **Utilidade**: Identificar modelos que o fornecedor diz ter entregue, mas que não foram registrados ou validados pela Stecla.

## 5. Plano de Ação RVT (Conversão IFC -> RVT)
- **Objetivo**: Gestão de modelos que não possuem arquivo nativo Revit.
- **Implementação**: Adicionar na tela de "Gestão de Escopo" (EntregasTab) um campo de "Plano de Ação" para itens com pendência de RVT:
  - Opção A: Solicitar nativo ao projetista.
  - Opção B: Gerar RVT a partir do IFC (As-Built Gerencial).
- **KPI**: Acompanhar o percentual de modelos que já possuem RVT vs. modelos em processo de conversão.

## Plano de Verificação

### Testes
1. **Modelos**: Confirmar que a lista de 108 modelos está agrupada corretamente no sistema.
2. **RA vs As-Built**: Garantir que as telas de "Realidade Aumentada" e "As-Built" operam de forma independente.
3. **Sala x Modelo**: Abrir uma sala com apontamentos de "HID" e verificar se o sistema indica o status do modelo as-built de Hidrossanitário.
