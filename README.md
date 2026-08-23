# 🏗️ STECLA AS-BUILT — Plataforma de Gestão e Auditoria As-Built

Plataforma corporativa especializada em gestão, auditoria e controle de conformidade de modelos e entregas **As-Built BIM** para grandes empreendimentos da construção civil.

---

## 🌟 Principais Funcionalidades

### 1. 📊 Visão Geral & Resumo Executivo
- **KPIs Executivos de As-Built**: Total de modelos contratados, modelos validados, modelos entregues com pendências, modelos entregues iguais ao projeto e modelos não entregues.
- **Progresso Visual por Edificação**: Gráficos de barras empilhadas com percentuais reais de validação por setor da obra.
- **Principais Constatações Técnicas Dinâmicas**: Pareceres técnicos e pontos de atenção críticos (destaque em vermelho) editáveis e independentes por construtora/parceiro (**Thá Engenharia**, **Ocle Engenharia**, etc.).

### 2. 📦 Gestão de Entregas & Escopo As-Built
- **Matriz de Escopo Contratual**: Controle dos 110 modelos esperados contratualmente por empresa, disciplina, edificação e status de disponibilidade do RVT original.
- **Histórico & Log de Remessas (SM)**: Rastreamento completo de remessas e pacotes de arquivos recebidos com auditoria técnica individualizada.
- **Cadastro de Pacotes em Lote**:
  - Cadastro agrupado por SM / Pacote com identificação, empresa, data e status inicial.
  - Tabela interativa com adição de múltiplos documentos de uma só vez.
  - Seleção rápida através de checkboxes da Lista Mestra de Escopo Contratual.
  - Colar lista de nomes de arquivos em lote.

### 3. 🔍 Apontamentos & Matriz de Qualidade
- **Matriz de Conformidade por Disciplina**: Auditoria por ambiente (Salas) cruzando status de Realidade Aumentada (RA) com modelos 3D.
- **Registro de Divergências**: Histórico de não conformidades com severidade, fotos/prints e anotações técnicas.
- **Importação de Pacotes BCF**: Leitura de tópicos e viewpoints de arquivos `.bcf` / `.bcfzip`.

### 4. 👷 Portal do Projetista & Relatórios de Campo
- **Portal do Projetista**: Interface dedicada para que projetistas visualizem e respondam a apontamentos de suas respectivas disciplinas.
- **Relatório de Campo**: Formulário ágil de inspeção em obra com suporte a sincronização offline de lotes.

### 5. 👥 Central de Membros & Permissões
- **Controle de Acesso Baseado em Perfis (RBAC)**:
  - `Admin`: Acesso total a todos os projetos e configurações globais.
  - `Editor`: Edição de dados e registros nos projetos autorizados.
  - `Viewer`: Visualização e acompanhamento de relatórios.
  - `Parceiro`: Acesso restrito aos modelos e apontamentos de sua empresa.
- **Configurações da Plataforma**: Painel centralizado para vincular usuários cadastrados aos projetos e gerenciar níveis de acesso.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, tRPC v11, Zod, Date-fns.
- **Banco de Dados**: PostgreSQL (Supabase) gerenciado via **Drizzle ORM**.
- **Autenticação**: Supabase Auth integrado com controle de permissões em banco.
- **Design System**: Identidade visual oficial Stecla (`#9C1915`, `#575756`, bordas suaves, tipografia técnica).

---

## 📁 Estrutura do Repositório

```
Dashboard-AsBuilt-Custom/
├── client/                     # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/        # Componentes globais (Layout, UI, Modais)
│   │   │   ├── layout/        # Sidebar (STECLA AS-BUILT.), Header, AppLayout
│   │   │   └── dashboard/     # Resumo Executivo, Constatações, BCF
│   │   ├── features/          # Módulos de domínio
│   │   │   ├── data-hub/      # Central de dados e tabelas mestras
│   │   │   ├── deliveries/    # Entregas As-Built, Escopo, Modais em Lote
│   │   │   ├── designer-portal/# Portal de resolução para projetistas
│   │   │   ├── field-reports/ # Inspeções de campo offline/online
│   │   │   └── issues/        # Gestão de apontamentos e matriz de qualidade
│   │   ├── pages/             # Páginas principais (Dashboard, Projetos, Configurações)
│   │   └── lib/               # Clientes tRPC e Supabase
├── server/                     # Backend Node.js + tRPC
│   ├── _core/                 # Servidor Express e roteador principal
│   ├── common/                # Conexão de banco (db.ts) e middleware tRPC
│   ├── modules/               # Módulos de serviço e roteadores desacoplados
│   │   ├── analytics/         # KPIs, Resumo Executivo e Constatações Técnicas
│   │   ├── deliveries/        # Escopo As-Built, Entregas e Histórico
│   │   ├── issues/            # Apontamentos e Verificações
│   │   ├── members/           # Gestão de membros e permissões globais
│   │   ├── projects/          # CRUD de Projetos
│   │   ├── reports/           # Geração de relatórios
│   │   └── rooms/             # Gestão de Salas e Ambientes
│   └── scripts/               # Scripts de migração e sincronização
└── drizzle/                   # Schemas Drizzle ORM (PostgreSQL)
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- **Node.js**: v20+ recomendado
- **Gerenciador de Pacotes**: `npm` ou `pnpm`

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/postgres
VITE_SUPABASE_URL=https://[PROJETO].supabase.co
VITE_SUPABASE_ANON_KEY=[SUA_ANON_KEY]
PORT=3000
```

### 3. Instalação e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Executar migrações do banco (se necessário)
npx tsx server/scripts/migrate-constatacoes.ts

# 3. Iniciar em modo de desenvolvimento (Frontend + Backend)
npm run dev
```

Acesse no navegador: **`http://localhost:5188`** *(ou a porta informada pelo Vite)*.

---

## 🧪 Verificação & Build

```bash
# Verificação de tipos TypeScript
npm run check

# Build de produção (Vite + esbuild)
npm run build
```

---

**Desenvolvido com excelência técnica para o fluxo de engenharia e auditoria As-Built.**
