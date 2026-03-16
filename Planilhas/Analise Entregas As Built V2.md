# Análise Entregas As Built — V2 (Atualizada)
**Data:** 16/03/2026  
**Projeto:** NEO-23001  
**Status da Planilha:** Preenchimento completo pela coordenação (Março/2026).

---

## 1. Atualizações da Versão V2

Esta versão incorpora os dados preenchidos pela coordenação entre 13/03 e 16/03, incluindo:
- **OCLE:** Entregas estendidas até a **SM 11 (11/03/2026)**.
- **THA:** Inclusão de **07 pacotes de entrega (SM 24 a SM 56)**, cobrindo diversas disciplinas e empresas terceirizadas (Engepoli, Schumar, Labres, MBP, Cassol, Elco).
- **Identificação de Pendências:** Mapeamento de itens com dúvidas (marcados com "?" pela coordenação).

---

## 2. Panorama Geral das Entregas (Dados Atualizados)

### Resumo por Responsável

| Responsável | Edificações | Volume de Itens | Padrão de Entrega | Frequência Real |
|---|---|---|---|---|
| **OCLE** | Produção, Suporte, Implantação, Central | ~148 itens (até SM 11/2026) | RVT (Nativo) ✅ | Quinzenal |
| **AeB** | ETE, Sede Recreativa | ~75 itens | IFC, DWG, PDF ⚠️ | Por demanda |
| **THA** | Todas (via terceiros) | ~60 itens (7 SMs) | RVT e IFC | Mensal/Conforme obra |

### Novas Entregas OCLE (Destaques Jan-Mar/2026)

| Período | SM | Edificação | Disciplinas Principais |
|---|---|---|---|
| 08/01 | SM 02 | Portaria, Produção | ELE, TEL (Log), UTI |
| 22/01 | SM 03 | Produção, Suporte | ELE, PCI, UTI |
| 05/02 | SM 04 | Implantação, Produção, Suporte | ELE, TEL, PCI, CLI, UTI, SDA |
| 25/02 | SM 09 | **ETE (Novo)** | HID (Infra de rede hidráulica) — *Primeira entrega OCLE para ETE* |
| 05/03 | SM 10 | Produção, Suporte, Central | ELE, TEL, PCI, CLI (Sala Limpa), UTI |
| 11/03 | SM 11 | **ETE (Novo)**, Produção | HID (Infra), ELE (Infra) |

### Entregas THA (Mapeamento de Terceiros)

| SM | Data | Empresa | Disciplinas | Edificação |
|---|---|---|---|---|
| SM 24 | Jun/25 | Schumar, Engepoli, Februce, TempoBR, Labres, Cassol, MBP | DRE, ZEN, MET, CLI, FUN, CON, ISO | Diversas |
| SM 28 | Jul/25 | Schumar, Februce, Labres, Cassol, MBP, Elco | DRE, MET, CLI, FUN, CON, ISO, ARQ, HID | Diversas |
| SM 33 | Ago/25 | Labres, Schumar | CON, DRE | Central, Implantação |
| SM 37 | Set/25 | Diversos | MET, CLI, FUN, CON, ISO | Produção |
| SM 43 | Dez/25 | Elco, Schumar, Engepoli | HID, DRE, FUN, ZEN | Implantação, Produção |
| SM 50 | Jan/26 | Elco, MBP, Februce | HID, PAV, ARQ, MET | Implantação, Produção, Suporte |
| SM 56 | Mar/26 | Februce, Elco | MET, HID | Produção, Central |

---

## 3. Dúvidas e Identificações Pendentes (Coordenação)

A coordenação identificou os seguintes itens que precisam de verificação técnica abrindo o modelo:

| Item | Problema / Dúvida | Localização na Planilha (Exemplos) |
|---|---|---|
| **Identificação de Edificação** | Marcados com "?" | Linhas 56, 57, 59, 64, 65, 71, 74, 89, 95, 100, 112, 117, 122, 124, 136, 141 (OCLE) |
| **Modelo Base Vazio** | Impossível identificar pelo nome do arquivo | Vários itens da OCLE a partir de 2026 |
| **Empresa MBP (THA)** | Disciplina incerta | Itens marcados como "?" em "Disciplina" (Linhas 240, 256, 274) |

---

## 4. Problemas Críticos (Mantidos e Reforçados)

1. **Falta de RVT na AeB (ETE/Sede):** Continua sendo o ponto de maior risco.
2. **Qualidade IFC Sede (AeB):** Modelos continuam vindo sem blocos até a 4ª entrega.
3. **Fundações ETE/Sede:** Não há modelo, apenas pranchas DWG.
4. **Relatórios AeB:** Faltando nas entregas 6 e 7.
5. **Divergência de Edificação (OCLE):** Arquivo `NEO-23001-AS-ELE-001-INFRA` na SM 11 (Mar/2026) está marcado como "Prédio Produção" mas Modelo Final diz "ETE1". Precisa confirmar se é ETE.

---

## 5. Próximos Passos (Dashboard)

Com os dados agora completos (mesmo com as dúvidas de identificação), avançaremos para:

1. **Importação de Dados:** Migrar estas ~300 linhas para o banco de dados.
2. **Funcionalidade de "Pacotes":** Agrupar visualmente por "Entrega" (ex: "021. SM 10 - 05.03.2026").
3. **Checklist BEP Automatico:** Na verificação, o sistema deve checar se é RVT e se tem os parâmetros de status.
4. **Gestão de Pendências:** Interface para você marcar a ação necessária (ex: "Pedir RVT", "Confirmar Edificação").

> [!NOTE]
> Vou agora preparar o Plano de Implementação para as mudanças no código do Dashboard.
