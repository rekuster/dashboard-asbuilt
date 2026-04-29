import { pgTable, serial, text, integer, timestamp, uuid, numeric } from "drizzle-orm/pg-core";

/**
 * Projects table - each project represents one construction site / obra
 */
export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),              // Contract code e.g. "NEO-23001"
    name: text("name").notNull(),                       // Project name e.g. "SuperNova"
    description: text("description"),
    client: text("client"),                             // Client name
    location: text("location"),                         // Project location
    ownerId: text("ownerId").notNull(),                 // Supabase Auth user ID
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    imageUrl: text("imageUrl"),
    status: text("status").default("ativo").notNull(),  // 'ativo' | 'concluido' | 'arquivado'
    baselineTargetDate: timestamp("baselineTargetDate"),
    baselineRoomsPerWeek: numeric("baselineRoomsPerWeek"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Project Members table - maps users to projects with roles
 */
export const projectMembers = pgTable("projectMembers", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("projectId").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: text("userId").notNull(),                   // Supabase Auth user ID
    email: text("email").notNull(),
    role: text("role").default("viewer").notNull(),     // 'owner' | 'editor' | 'viewer'
    invitedAt: timestamp("invitedAt").defaultNow().notNull(),
    acceptedAt: timestamp("acceptedAt"),
});

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    openId: text("openId").notNull().unique(),
    name: text("name"),
    email: text("email"),
    loginMethod: text("loginMethod"),
    role: text("role").default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Salas table - stores room information
 */
export const salas = pgTable("salas", {
    id: serial("id").primaryKey(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    edificacao: text("edificacao").notNull(),
    pavimento: text("pavimento").notNull(),
    setor: text("setor").notNull(),
    nome: text("nome").notNull(),
    numeroSala: text("numeroSala").notNull(),
    augin: integer("augin").default(0),
    status: text("status").default("PENDENTE").notNull(),
    statusRA: text("statusRA"),
    dataVerificada: timestamp("dataVerificada"),
    faltouDisciplina: text("faltouDisciplina"),
    revisar: text("revisar"),
    obs: text("obs"),
    dataVerificacao2: timestamp("dataVerificacao2"),
    obs2: text("obs2"),
    trackerPosicionado: integer("trackerPosicionado").default(0),
    plantaImpressa: integer("plantaImpressa").default(0),
    qrCodePlastificado: integer("qrCodePlastificado").default(0),
    imagemPlantaUrl: text("imagemPlantaUrl"),
    ifcExpressId: text("ifcExpressId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Apontamentos table - stores divergences/issues found
 */
export const apontamentos = pgTable("apontamentos", {
    id: serial("id").primaryKey(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    numeroApontamento: integer("numeroApontamento").notNull(),
    data: timestamp("data").notNull(),
    edificacao: text("edificacao").notNull(),
    pavimento: text("pavimento").notNull(),
    setor: text("setor").notNull(),
    sala: text("sala").notNull(),
    disciplina: text("disciplina").notNull(),
    divergencia: text("divergencia"),
    fotoUrl: text("fotoUrl"),
    fotoReferenciaUrl: text("fotoReferenciaUrl"),
    status: text("status").default("ATIVA").notNull(), // 'ATIVA', 'EM_REVISAO', 'RESOLVIDA', 'NAO_PROCEDE'
    prioridade: text("prioridade").default("NORMAL"), // 'BAIXA', 'NORMAL', 'ALTA', 'URGENTE'
    tipo: text("tipo").default("DIVERGÊNCIA"),      // 'DIVERGÊNCIA', 'INCONSISTÊNCIA', 'SOLICITAÇÃO'
    comentario: text("comentario"),                 // Comentários de resolução ou notas adicionais
    dataResolvido: timestamp("dataResolvido"),      // Data em que o apontamento foi marcado como resolvido
    responsavel: text("responsavel"),
    dataEnvio: timestamp("dataEnvio"),
    enviado: integer("enviado").default(0).notNull(), // 0 = Não enviado, 1 = Enviado
    asBuiltNota: text("asBuiltNota"),               // Nota técnica específica da verificação As-Built
    asBuiltPrintUrl: text("asBuiltPrintUrl"),       // Print do modelo As-Built comprovando a resolução
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Uploads table - stores Excel upload history
 */
export const uploads = pgTable("uploads", {
    id: serial("id").primaryKey(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    fileName: text("fileName").notNull(),
    fileSize: integer("fileSize").notNull(),
    uploadedBy: integer("uploadedBy").notNull(),
    totalSalas: integer("totalSalas").default(0),
    totalApontamentos: integer("totalApontamentos").default(0),
    status: text("status").default("PROCESSADO").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * IFC Files table - stores uploaded IFC models
 */
export const ifcFiles = pgTable("ifcFiles", {
    id: serial("id").primaryKey(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    fileName: text("fileName").notNull(),
    filePath: text("filePath").notNull(),
    edificacao: text("edificacao"),
    uploadedBy: integer("uploadedBy").notNull(),
    fileSize: integer("fileSize").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * As-Built Scope Master List - defines expected deliveries per company
 */
export const escopoAsBuilt = pgTable("escopoAsBuilt", {
    id: serial("id").primaryKey(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    empresa: text("empresa").notNull(),           // "Ocle", "AeB"
    disciplina: text("disciplina").notNull(),      // "Hidrossanitário", "Elétrica"
    edificacao: text("edificacao").notNull(),       // "Bloco A"
    nomeModelo: text("nomeModelo").notNull(),       // "Hidro_BlocoA.rvt"
    nomeModeloFinal: text("nomeModeloFinal"),       // The expected final delivery model name
    descricao: text("descricao"),
    temRvtOriginal: integer("temRvtOriginal").default(0), // 1=possui rvt de projeto, 0=não possui
    pendenciaRvt: text("pendenciaRvt"),              // Descrição do problema do RVT
    acaoRvt: text("acaoRvt"),                        // Plano de ação (ex: "Solicitado", "Converter IFC")
    ativo: integer("ativo").default(1).notNull(),   // 1=ativo, 0=encerrado
    
    // Integração Planilha Thá (Reconciliação)
    statusTha: text("statusTha"),                    // Status na planilha da Thá (ex: "POSTADO")
    dataAtualizacaoTha: timestamp("dataAtualizacaoTha"), // Data da última atualização na planilha
    obsTha: text("obsTha"),                          // Observações da Thá
    modeloBaseTha: text("modeloBaseTha"),            // Nome do modelo base na planilha (para cross-ref)

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * As-Built Deliveries table - partial deliveries linked to scope items
 */
export const entregasAsBuilt = pgTable("entregasAsBuilt", {
    id: serial("id").primaryKey(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    escopoId: integer("escopoId").references(() => escopoAsBuilt.id, { onDelete: 'set null' }),
    nomeDocumento: text("nomeDocumento").notNull(),
    tipoDocumento: text("tipoDocumento").notNull(), // 'relatorio' | 'dwg' | 'rvt'
    edificacao: text("edificacao").notNull(),
    disciplina: text("disciplina").notNull(),
    empresaResponsavel: text("empresaResponsavel").notNull(),
    dataPrevista: timestamp("dataPrevista").notNull(),
    dataRecebimento: timestamp("dataRecebimento"),
    periodoInicio: timestamp("periodoInicio"),
    periodoFim: timestamp("periodoFim"),
    status: text("status").default("AGUARDANDO").notNull(),
    resultado: text("resultado"),                   // 'CONFORME' | 'NAO_CONFORME' | 'VERIFICADA_RESSALVA' | null
    dataVerificacao: timestamp("dataVerificacao"),
    apontamentosVerificacao: text("apontamentosVerificacao"),
    descricao: text("descricao"),
    
    // Novas colunas para coordenação avançada
    numeroEntrega: integer("numeroEntrega"),
    identificadorEntrega: text("identificadorEntrega"), // ex: "SM 10", "3ª Entrega"
    formato: text("formato"),                         // "rvt", "ifc", "dwg", "pdf"
    isModelo: integer("isModelo").default(0),           // 1=Sim, 0=Não
    modeloBaseReferencia: text("modeloBaseReferencia"),
    acoesNecessarias: text("acoesNecessarias"),         // pendências geradas (ex: "Pedir RVT")
    checkpointBep: text("checkpointBep"),               // JSON string para checklist do BEP
    avancoFisico: text("avancoFisico"),                 // Detalhamento de avanço por sala/pavimento
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * As-Built Deliveries History table - logs changes and comments
 */
export const entregasHistorico = pgTable("entregasHistorico", {
    id: serial("id").primaryKey(),
    entregaId: integer("entregaId").notNull().references(() => entregasAsBuilt.id, { onDelete: 'cascade' }),
    acao: text("acao").notNull(), // 'CRIADO', 'STATUS_ALTERADO', 'COMENTARIO', 'EDITADO'
    descricao: text("descricao").notNull(), // The actual log message or comment
    usuario: text("usuario").default("Sistema").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * As-Built Model Verification per room and discipline
 */
export const verificacaoModelo = pgTable("verificacaoModelo", {
    id: serial("id").primaryKey(),
    salaId: integer("salaId").notNull().references(() => salas.id, { onDelete: 'cascade' }),
    disciplina: text("disciplina").notNull(),
    status: text("status").default("PENDENTE").notNull(), // 'OK', 'PENDENTE', 'NAO_APLICAVEL'
    observacao: text("observacao"),
    printUrl: text("printUrl"),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * History of generated divergence reports sent to stakeholders
 */
export const relatoriosDivergencia = pgTable("relatoriosDivergencia", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("projectId").references(() => projects.id, { onDelete: 'cascade' }),
    titulo: text("titulo").notNull(),
    periodoInicio: timestamp("periodoInicio"),
    periodoFim: timestamp("periodoFim"),
    disciplina: text("disciplina"),
    quantidadeItens: integer("quantidadeItens").default(0),
    geradoPor: text("geradoPor").default("Sistema"),
    arquivoUrl: text("arquivoUrl"),
    status: text("status").default("ENVIADO").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;
export type EntregaHistorico = typeof entregasHistorico.$inferSelect;
export type InsertEntregaHistorico = typeof entregasHistorico.$inferInsert;
export type RelatorioDivergencia = typeof relatoriosDivergencia.$inferSelect;
export type InsertRelatorioDivergencia = typeof relatoriosDivergencia.$inferInsert;
