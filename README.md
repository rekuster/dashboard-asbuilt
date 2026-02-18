# Dashboard As Built - Custom

## 🎉 Projeto Criado com Sucesso!

Este é o seu novo dashboard editável baseado no projeto original do Manus, com integração de visualizador IFC 3D.

## 📁 Estrutura do Projeto

```
Dashboard-AsBuilt-Custom/
├── client/                 # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas (Dashboard, NotFound)
│   │   ├── lib/           # Utilitários e tRPC client
│   │   ├── App.tsx        # Componente principal
│   │   └── main.tsx       # Entry point
│   └── index.html
├── server/                 # Backend Express + tRPC
│   ├── _core/             # Configurações (Express, tRPC, env)
│   ├── db.ts              # Funções de banco de dados
│   ├── routers.ts         # Rotas tRPC
│   ├── excelProcessor.ts  # Processamento de Excel
│   ├── uploadHandler.ts   # Upload de Excel
│   └── ifcHandler.ts      # Upload e gestão de IFC
├── drizzle/               # Database schema
│   └── schema.ts          # 5 tabelas (users, salas, apontamentos, uploads, ifcFiles)
├── shared/                # Código compartilhado
└── uploads/ifc/           # Arquivos IFC uploadados
```

## 🚀 Como Rodar o Projeto

### 1. Instalar Dependências

```bash
cd "c:\Users\RenataViannaKüster\Downloads\01.Neodent\8. As built\Antigravity\Dashboard-AsBuilt-Custom"
pnpm install
```

### 2. Configurar Banco de Dados

Crie um arquivo `.env` baseado no `.env.example`:

```env
DATABASE_URL=mysql://user:password@localhost:3306/dashboard_asbuilt
NODE_ENV=development
PORT=3000
```

### 3. Rodar Migrations

```bash
pnpm db:push
```

### 4. Iniciar o Servidor de Desenvolvimento

```bash
pnpm dev
```

O dashboard estará disponível em: **http://localhost:5173**

## 🎨 Funcionalidades Implementadas

### ✅ Backend Completo
- ✅ Schema do banco com 5 tabelas
- ✅ Funções de acesso ao banco (db.ts)
- ✅ Rotas tRPC para dashboard e IFC
- ✅ Processamento de Excel
- ✅ Upload e gestão de arquivos IFC
- ✅ Sistema de cores para visualização 3D
- ✅ Servidor Express configurado

### ✅ Frontend & Dashboard
- ✅ React 19 + TypeScript + Vite
- ✅ Integração tRPC v11 (Client + Server)
- ✅ Design System Premium com Lucide Icons e TailwindCSS
- ✅ Dashboard com KPIs em tempo real
- ✅ Filtros dinâmicos por edificação
- ✅ Tabela de apontamentos interativa
- ✅ Upload e processamento inteligente de Excel (Status da Coluna N)

### ✅ Visualizador IFC 3D (BIM)
- ✅ Integração robusta com `web-ifc-three`
- ✅ Carregamento de elementos individualizados (IfcSlab, IfcSpace, etc.)
- ✅ Sistema de Raycasting preciso para seleção de objetos
- ✅ **Modo Raio-X (X-Ray)** para visualização interna
- ✅ **Destaque Azul (Highlight)** inteligente com limpeza automática
- ✅ **Modo de Mapeamento Interativo** para vincular objetos 3D a registros do banco
- ✅ **Volumes Fantasmadas (Ghost Volumes)** para representação de ambientes (IfcSpace)

## 🚧 Próximas Implementações
- [ ] Gráficos estatísticos com Recharts (Evolução de apontamentos, Pizza por status)
- [ ] Geração de relatórios automatizados em PDF/Excel
- [ ] Exportação do IFC modificado com metadados de status
- [ ] Dashboard Mobile (Responsividade aprimorada)

## 🎨 Sistema de Cores e Status

O visualizador 3D coloriza as salas automaticamente de acordo com as regras de negócio:

- 🟢 **Verde (#22C55E)** - Status "Verificada" na planilha
- 🟡 **Amarelo (#EAB308)** - Status "Em Revisão" ou "Revisar"
- 🔴 **Vermelho (#EF4444)** - Crítico (Regra: Mais de 10 apontamentos na sala)
- ⚪ **Cinza (#9CA3AF)** - Status "Pendente" ou não encontrado
- 🔵 **Azul (#3B82F6)** - Destaque de seleção (Highlight interativo)

## 📡 API Endpoints (tRPC)

### Dashboard
- `dashboard.getKPIs` - Métricas principais de edificação/setor
- `dashboard.getSalas` - Lista de salas e seus atributos
- `dashboard.getApontamentos` - Detalhes das divergências encontradas
- `dashboard.uploadExcel` - Processador de planilha com mapeamento de colunas

### IFC
- `ifc.getAllFiles` - Gerenciador de modelos 3D
- `ifc.getRoomsWithColors` - Backend de cores baseado em status e apontamentos
- `ifc.linkIfcToRoom` - Vinculação manual ExpressID <-> Sala
- `ifc.uploadFile` / `ifc.deleteFile` - Gestão de arquivos .ifc no servidor

## 🛠️ Scripts Disponíveis

```bash
pnpm dev          # Desenvolvimento (frontend + backend)
pnpm build        # Build para produção
pnpm db:push      # Sincronizar schema do banco (SQLite)
pnpm format       # Formatar código com Prettier
```

## 📝 Próximos Passos para o Usuário

1. **Modelagem no Revit**: Dividir pisos grandes por ambiente para garantir 100% de visibilidade no visualizador.
2. **Ciclo de Verificação**: Carregar Excel atualizado para refletir mudanças de status na obra.
3. **Mapeamento**: Usar a ferramenta "Lápis" no visualizador para terminar de vincular as salas restantes.

## 🎯 Visão de Futuro

O objetivo é transformar este dashboard em uma central de comando As Built, onde cada elemento físico da obra tem um "Gêmeo Digital" (Digital Twin) com histórico completo de verificações e apontamentos.

---

**Desenvolvido com ❤️ para otimizar o workflow de mapeamento As Built na Neodent**
