import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    openId: text("openId").notNull().unique(),
    name: text("name"),
    email: text("email"),
    loginMethod: text("loginMethod"),
    role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
    lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Salas table - stores room information
 */
export const salas = sqliteTable("salas", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    edificacao: text("edificacao").notNull(),
    pavimento: text("pavimento").notNull(),
    setor: text("setor").notNull(),
    nome: text("nome").notNull(),
    numeroSala: text("numeroSala").notNull(),
    augin: integer("augin").default(0),
    status: text("status").default("PENDENTE").notNull(),
    statusRA: text("statusRA"),
    dataVerificada: integer("dataVerificada", { mode: "timestamp_ms" }),
    faltouDisciplina: text("faltouDisciplina"),
    revisar: text("revisar"),
    obs: text("obs"),
    dataVerificacao2: integer("dataVerificacao2", { mode: "timestamp_ms" }),
    obs2: text("obs2"),
    trackerPosicionado: integer("trackerPosicionado").default(0), // 0: Não, 1: Sim
    plantaImpressa: integer("plantaImpressa").default(0), // 0: Não, 1: Sim
    qrCodePlastificado: integer("qrCodePlastificado").default(0), // 0: Não, 1: Sim
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export type Sala = typeof salas.$inferSelect;
export type InsertSala = typeof salas.$inferInsert;

/**
 * Apontamentos table - stores divergences/issues found
 */
export const apontamentos = sqliteTable("apontamentos", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    numeroApontamento: integer("numeroApontamento").notNull(),
    data: integer("data", { mode: "timestamp_ms" }).notNull(),
    edificacao: text("edificacao").notNull(),
    pavimento: text("pavimento").notNull(),
    setor: text("setor").notNull(),
    sala: text("sala").notNull(),
    disciplina: text("disciplina").notNull(),
    divergencia: text("divergencia"),
    fotoUrl: text("fotoUrl"),
    fotoReferenciaUrl: text("fotoReferenciaUrl"), // For Project/Model comparison
    status: text("status").default("PENDENTE").notNull(), // 'PENDENTE', 'RESOLVIDO'
    responsavel: text("responsavel"), // 'Thá' ou 'Ocle'
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export type Apontamento = typeof apontamentos.$inferSelect;
export type InsertApontamento = typeof apontamentos.$inferInsert;

/**
 * Uploads table - stores Excel upload history
 */
export const uploads = sqliteTable("uploads", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fileName: text("fileName").notNull(),
    fileSize: integer("fileSize").notNull(),
    uploadedBy: integer("uploadedBy").notNull(),
    totalSalas: integer("totalSalas").default(0),
    totalApontamentos: integer("totalApontamentos").default(0),
    status: text("status").default("PROCESSADO").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

/**
 * IFC Files table - stores uploaded IFC models
 */
export const ifcFiles = sqliteTable("ifcFiles", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fileName: text("fileName").notNull(),
    filePath: text("filePath").notNull(),
    edificacao: text("edificacao"),
    uploadedBy: integer("uploadedBy").notNull(),
    fileSize: integer("fileSize").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export type IfcFile = typeof ifcFiles.$inferSelect;
export type InsertIfcFile = typeof ifcFiles.$inferInsert;

/**
 * As-Built Deliveries table - manual control for document collection
 */
export const entregasAsBuilt = sqliteTable("entregasAsBuilt", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nomeDocumento: text("nomeDocumento").notNull(),
    tipoDocumento: text("tipoDocumento").notNull(), // 'relatorio' | 'dwg' | 'rvt'
    edificacao: text("edificacao").notNull(),
    disciplina: text("disciplina").notNull(),
    empresaResponsavel: text("empresaResponsavel").notNull(),
    dataPrevista: integer("dataPrevista", { mode: "timestamp_ms" }).notNull(),
    dataRecebimento: integer("dataRecebimento", { mode: "timestamp_ms" }),
    status: text("status").default("AGUARDANDO").notNull(), // 'AGUARDANDO', 'RECEBIDO', 'EM_REVISAO', 'VALIDADO', 'REJEITADO'
    descricao: text("descricao"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

/**
 * As-Built Deliveries History table - logs changes and comments
 */
export const entregasHistorico = sqliteTable("entregasHistorico", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entregaId: integer("entregaId").notNull().references(() => entregasAsBuilt.id, { onDelete: 'cascade' }),
    acao: text("acao").notNull(),
    descricao: text("descricao").notNull(),
    usuario: text("usuario").default("Sistema").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export type EntregaHistorico = typeof entregasHistorico.$inferSelect;
export type InsertEntregaHistorico = typeof entregasHistorico.$inferInsert;
