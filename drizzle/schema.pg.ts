import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    ifcExpressId: text("ifcExpressId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Apontamentos table - stores divergences/issues found
 */
export const apontamentos = pgTable("apontamentos", {
    id: serial("id").primaryKey(),
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
    status: text("status").default("PENDENTE").notNull(),
    responsavel: text("responsavel"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Uploads table - stores Excel upload history
 */
export const uploads = pgTable("uploads", {
    id: serial("id").primaryKey(),
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
    fileName: text("fileName").notNull(),
    filePath: text("filePath").notNull(),
    edificacao: text("edificacao"),
    uploadedBy: integer("uploadedBy").notNull(),
    fileSize: integer("fileSize").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * As-Built Deliveries table - manual control for document collection
 */
export const entregasAsBuilt = pgTable("entregasAsBuilt", {
    id: serial("id").primaryKey(),
    nomeDocumento: text("nomeDocumento").notNull(),
    tipoDocumento: text("tipoDocumento").notNull(), // 'relatorio' | 'dwg' | 'rvt'
    edificacao: text("edificacao").notNull(),
    disciplina: text("disciplina").notNull(),
    empresaResponsavel: text("empresaResponsavel").notNull(),
    dataPrevista: timestamp("dataPrevista").notNull(),
    dataRecebimento: timestamp("dataRecebimento"),
    status: text("status").default("AGUARDANDO").notNull(), // 'AGUARDANDO', 'RECEBIDO', 'EM_REVISAO', 'VALIDADO', 'REJEITADO'
    descricao: text("descricao"),
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

export type EntregaHistorico = typeof entregasHistorico.$inferSelect;
export type InsertEntregaHistorico = typeof entregasHistorico.$inferInsert;
