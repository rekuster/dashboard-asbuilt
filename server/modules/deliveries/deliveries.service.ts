import { eq, and, sql, desc } from "drizzle-orm";
import {
    getDb,
    escopoAsBuilt,
    entregasAsBuilt,
    entregasHistorico,
    type EscopoAsBuilt,
    type EntregaAsBuilt,
    type InsertEscopoAsBuilt,
    type InsertEntregaAsBuilt,
} from "../../common/db";
import { format, startOfWeek, differenceInCalendarWeeks, addWeeks } from "date-fns";

export async function getEscopos(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    const escopos = await db
        .select()
        .from(escopoAsBuilt)
        .where(eq(escopoAsBuilt.projectId, projectId))
        .orderBy(escopoAsBuilt.empresa, escopoAsBuilt.edificacao, escopoAsBuilt.disciplina);

    const entregas = await db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, projectId));

    return escopos.map((escopo: any) => {
        // Encontra entregas vinculadas por escopoId ou por (empresa + disciplina + edificação)
        const matchedEntregas = entregas.filter(
            (e: any) =>
                (e.escopoId && e.escopoId === escopo.id) ||
                (e.disciplina?.toLowerCase() === escopo.disciplina?.toLowerCase() &&
                    e.edificacao?.toLowerCase() === escopo.edificacao?.toLowerCase() &&
                    e.empresaResponsavel?.toLowerCase() === escopo.empresa?.toLowerCase())
        );

        // Identifica a entrega mais recente
        const sorted = [...matchedEntregas].sort((a, b) => {
            const dateA = a.dataRecebimento ? new Date(a.dataRecebimento).getTime() : 0;
            const dateB = b.dataRecebimento ? new Date(b.dataRecebimento).getTime() : 0;
            return dateB - dateA;
        });

        const latestEntrega = sorted[0] || null;

        // Determina o status de auditoria do modelo
        let statusAuditoria = "NAO_ENTREGUE";
        if (matchedEntregas.length > 0) {
            const hasValidado = matchedEntregas.some(
                (e: any) => e.status === "VALIDADO" || e.resultado === "CONFORME"
            );
            const hasIgualProjeto = matchedEntregas.some(
                (e: any) =>
                    e.status === "IGUAL_PROJETO" ||
                    (e.descricao && e.descricao.toLowerCase().includes("igual ao projeto"))
            );
            const hasPendencias = matchedEntregas.some(
                (e: any) =>
                    e.status === "COM_PENDENCIAS" ||
                    e.status === "EM_REVISAO" ||
                    e.status === "VALIDADO_PARCIAL" ||
                    e.status === "REJEITADO"
            );

            if (hasValidado) {
                statusAuditoria = "VALIDADO";
            } else if (hasIgualProjeto) {
                statusAuditoria = "IGUAL_PROJETO";
            } else if (hasPendencias || matchedEntregas.length > 0) {
                statusAuditoria = "COM_PENDENCIAS";
            }
        }

        return {
            ...escopo,
            totalEntregas: matchedEntregas.length,
            statusAuditoria,
            ultimaEntregaData: latestEntrega?.dataRecebimento || null,
            ultimaEntregaIdentificador: latestEntrega?.identificadorEntrega || null,
        };
    });
}

export async function upsertEscopo(data: {
    id?: number;
    projectId?: string | null;
    empresa: string;
    disciplina: string;
    edificacao: string;
    nomeModelo: string;
    nomeModeloFinal?: string;
    descricao?: string | null;
    temRvtOriginal?: number;
    pendenciaRvt?: string | null;
    acaoRvt?: string | null;
    ativo?: number;
}) {
    const db = await getDb();
    if (!db) return null;

    if (data.id) {
        const [result] = await db
            .update(escopoAsBuilt)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(escopoAsBuilt.id, data.id))
            .returning();
        return result;
    } else {
        const [result] = await db
            .insert(escopoAsBuilt)
            .values({
                projectId: data.projectId || null,
                empresa: data.empresa,
                disciplina: data.disciplina,
                edificacao: data.edificacao,
                nomeModelo: data.nomeModelo,
                nomeModeloFinal: data.nomeModeloFinal || null,
                descricao: data.descricao || null,
                temRvtOriginal: data.temRvtOriginal ?? 0,
                pendenciaRvt: data.pendenciaRvt || null,
                acaoRvt: data.acaoRvt || null,
                ativo: data.ativo ?? 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();
        return result;
    }
}

export async function deleteEscopo(id: number) {
    const db = await getDb();
    if (!db) return false;

    await db.delete(escopoAsBuilt).where(eq(escopoAsBuilt.id, id));
    return true;
}

export async function getEntregas(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, projectId))
        .orderBy(desc(entregasAsBuilt.numeroEntrega), desc(entregasAsBuilt.dataRecebimento));
}

export async function getEntregasByEscopo(escopoId: number) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.escopoId, escopoId))
        .orderBy(desc(entregasAsBuilt.dataPrevista));
}

export async function getEntregasHistorico(id: number) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(entregasHistorico)
        .where(eq(entregasHistorico.entregaId, id))
        .orderBy(desc(entregasHistorico.createdAt));
}

export async function upsertEntrega(data: any) {
    const db = await getDb();
    if (!db) return null;

    const { id, comentario, ...rawValues } = data;

    const values = Object.fromEntries(
        Object.entries(rawValues).filter(([_, v]) => v !== undefined)
    ) as any;

    const normalizeDate = (d: any) => {
        if (!d) return d;
        if (typeof d === "string") {
            return new Date(d + "T12:00:00");
        }
        if (d instanceof Date) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
        }
        return d;
    };

    if (values.dataPrevista) values.dataPrevista = normalizeDate(values.dataPrevista);
    if (values.dataRecebimento) values.dataRecebimento = normalizeDate(values.dataRecebimento);
    if (values.periodoInicio) values.periodoInicio = normalizeDate(values.periodoInicio);
    if (values.periodoFim) values.periodoFim = normalizeDate(values.periodoFim);
    if (values.dataVerificacao) values.dataVerificacao = normalizeDate(values.dataVerificacao);

    const { escopoIds, escopoNames, ...commonValues } = values;

    if (escopoIds && Array.isArray(escopoIds)) {
        return await db.transaction(async (tx: any) => {
            const batchResults = [];
            for (const escId of escopoIds) {
                const [esc] = await tx
                    .select()
                    .from(escopoAsBuilt)
                    .where(eq(escopoAsBuilt.id, escId))
                    .limit(1);
                if (!esc) continue;

                const individualName =
                    (escopoNames && escopoNames[String(escId)]) || commonValues.nomeDocumento;

                const newRecord = await tx
                    .insert(entregasAsBuilt)
                    .values({
                        ...commonValues,
                        nomeDocumento: individualName,
                        escopoId: escId,
                        edificacao: commonValues.edificacao || esc.edificacao,
                        disciplina: commonValues.disciplina || esc.disciplina,
                        empresaResponsavel: commonValues.empresaResponsavel || esc.empresa,
                        identificadorEntrega: commonValues.identificadorEntrega || null,
                        formato: commonValues.formato || null,
                        isModelo: commonValues.isModelo ?? 0,
                        modeloBaseReferencia: commonValues.modeloBaseReferencia || null,
                        acoesNecessarias: commonValues.acoesNecessarias || null,
                        checkpointBep: commonValues.checkpointBep || null,
                        avancoFisico: commonValues.avancoFisico || null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();

                if (newRecord && newRecord.length > 0) {
                    batchResults.push(newRecord[0]);
                    await tx.insert(entregasHistorico).values({
                        entregaId: newRecord[0].id,
                        acao: "CRIADO",
                        descricao: `Entrega em lote criada: ${individualName}`,
                        usuario: "Usuário",
                        createdAt: new Date(),
                    });
                }
            }
            return batchResults;
        });
    }

    let result;
    if (id) {
        const current = await db
            .select()
            .from(entregasAsBuilt)
            .where(eq(entregasAsBuilt.id, id))
            .limit(1);
        const oldStatus = current.length > 0 ? current[0].status : null;

        result = await db
            .update(entregasAsBuilt)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(entregasAsBuilt.id, id))
            .returning();

        if (oldStatus && values.status && oldStatus !== values.status) {
            await db.insert(entregasHistorico).values({
                entregaId: id,
                acao: "STATUS_ALTERADO",
                descricao: `Status alterado de "${oldStatus}" para "${values.status}"`,
                usuario: "Usuário",
                createdAt: new Date(),
            });
        }
    } else {
        result = await db
            .insert(entregasAsBuilt)
            .values({
                ...values,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (result && result.length > 0) {
            await db.insert(entregasHistorico).values({
                entregaId: result[0].id,
                acao: "CRIADO",
                descricao: `Entrega criada: ${values.nomeDocumento}`,
                usuario: "Usuário",
                createdAt: new Date(),
            });
        }
    }

    if (comentario && id) {
        await db.insert(entregasHistorico).values({
            entregaId: id,
            acao: "COMENTARIO",
            descricao: comentario,
            usuario: "Usuário",
            createdAt: new Date(),
        });
    }

    return result;
}

export async function createBatchEntregas(data: {
    projectId: string;
    identificadorEntrega: string;
    dataRecebimento: any;
    empresaResponsavel: string;
    status: string;
    edificacaoPadrao?: string;
    disciplinaPadrao?: string;
    descricao?: string | null;
    documentos: Array<{
        nomeDocumento: string;
        formato?: string;
        edificacao?: string;
        disciplina?: string;
        escopoId?: number | null;
        modeloBaseReferencia?: string | null;
    }>;
}) {
    const db = await getDb();
    if (!db) return [];

    const normalizeDate = (d: any) => {
        if (!d) return new Date();
        if (typeof d === "string") return new Date(d + "T12:00:00");
        return d;
    };

    const dataRec = normalizeDate(data.dataRecebimento);

    const current = await db
        .select({ numeroEntrega: entregasAsBuilt.numeroEntrega })
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, data.projectId));

    let nextNum = current.reduce((max, c) => Math.max(max, c.numeroEntrega || 0), 0);

    const insertedRows = [];

    for (const doc of data.documentos) {
        if (!doc.nomeDocumento || !doc.nomeDocumento.trim()) continue;

        nextNum++;
        const formato = doc.formato || "rvt";
        const isModelo = formato === "rvt" || formato === "ifc" ? 1 : 0;
        const tipoDoc =
            formato === "rvt" || formato === "ifc"
                ? "rvt"
                : formato === "dwg"
                ? "dwg"
                : "relatorio";
        const edificacao = doc.edificacao || data.edificacaoPadrao || "Geral";
        const disciplina = doc.disciplina || data.disciplinaPadrao || "Coordenação Geral";

        const [newRow] = await db
            .insert(entregasAsBuilt)
            .values({
                projectId: data.projectId,
                numeroEntrega: nextNum,
                identificadorEntrega: data.identificadorEntrega,
                nomeDocumento: doc.nomeDocumento.trim(),
                formato,
                tipoDocumento: tipoDoc,
                isModelo,
                edificacao,
                disciplina,
                empresaResponsavel: data.empresaResponsavel,
                dataRecebimento: dataRec,
                dataPrevista: dataRec,
                status: data.status || "COM_PENDENCIAS",
                escopoId: doc.escopoId || null,
                modeloBaseReferencia: doc.modeloBaseReferencia || null,
                descricao: data.descricao || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (newRow) {
            insertedRows.push(newRow);
            await db.insert(entregasHistorico).values({
                entregaId: newRow.id,
                acao: "CRIADO",
                descricao: `Documento incluído no pacote ${data.identificadorEntrega}`,
                usuario: "Usuário",
                createdAt: new Date(),
            });
        }
    }

    return insertedRows;
}

export async function deleteEntrega(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    await db.delete(entregasAsBuilt).where(eq(entregasAsBuilt.id, id));
    return true;
}

export async function getEntregasStats(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    const escConditions = [eq(escopoAsBuilt.projectId, projectId)];
    if (edificacao && edificacao !== 'Todas') {
        escConditions.push(eq(escopoAsBuilt.edificacao, edificacao));
    }
    const escopos = await db.select().from(escopoAsBuilt).where(and(...escConditions));

    const entConditions = [eq(entregasAsBuilt.projectId, projectId)];
    if (edificacao && edificacao !== 'Todas') {
        entConditions.push(eq(entregasAsBuilt.edificacao, edificacao));
    }
    const entregas = await db.select().from(entregasAsBuilt).where(and(...entConditions));

    const validados = entregas.filter((e: any) => e.status === 'VALIDADO' || e.resultado === 'CONFORME').length;
    const comPendencias = entregas.filter((e: any) => e.status === 'COM_PENDENCIAS' || e.status === 'EM_REVISAO' || e.status === 'VALIDADO_PARCIAL' || e.status === 'VALIDADO_RESSALVA').length;
    const igualProjeto = entregas.filter((e: any) => e.status === 'IGUAL_PROJETO').length;
    const rejeitados = entregas.filter((e: any) => e.status === 'REJEITADO' || e.resultado === 'NAO_CONFORME').length;

    return {
        total: escopos.length,
        aguardando: Math.max(0, escopos.length - validados),
        recebidos: entregas.length,
        emRevisao: comPendencias,
        validados: validados,
        validadosParcial: 0,
        validadosRessalva: 0,
        rejeitados: rejeitados + igualProjeto,
        atrasados: 0,
    };
}

export async function registrarVerificacao(data: {
    id: number;
    resultado: string;
    apontamentosVerificacao?: string | null;
}) {
    const db = await getDb();
    if (!db) return null;

    const newStatus = data.resultado === "CONFORME" ? "VALIDADO" : "REJEITADO";

    const result = await db
        .update(entregasAsBuilt)
        .set({
            resultado: data.resultado,
            dataVerificacao: new Date(),
            apontamentosVerificacao: data.apontamentosVerificacao || null,
            status: newStatus,
            updatedAt: new Date(),
        })
        .where(eq(entregasAsBuilt.id, data.id))
        .returning();

    if (result && result.length > 0) {
        await db.insert(entregasHistorico).values({
            entregaId: data.id,
            acao: "STATUS_ALTERADO",
            descricao: `Verificação: ${data.resultado}${
                data.apontamentosVerificacao ? " — " + data.apontamentosVerificacao : ""
            }`,
            usuario: "Usuário",
            createdAt: new Date(),
        });
    }

    return result;
}

export async function getAsBuiltStatus(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    let escopoQuery = db.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.projectId, projectId));
    if (edificacao) {
        escopoQuery = db
            .select()
            .from(escopoAsBuilt)
            .where(
                and(
                    eq(escopoAsBuilt.projectId, projectId),
                    sql`${escopoAsBuilt.edificacao} ILIKE ${"%" + edificacao + "%"}`
                )
            ) as any;
    }
    const escopos = await escopoQuery;

    const { entregasMap, allEntregas } = await getEntregasPorEscopo(projectId, edificacao);

    const totalModelos = escopos.length;
    const projectModelsUnique = new Set(escopos.map((e: any) => e.nomeModelo).filter(Boolean));
    const asBuiltModelsUnique = new Set(escopos.map((e: any) => e.nomeModeloFinal).filter(Boolean));

    const result = {
        totalModelos,
        projectModels: projectModelsUnique.size,
        asBuiltModels: asBuiltModelsUnique.size || totalModelos,
        consolidationFactor:
            projectModelsUnique.size > 0 ? (totalModelos / projectModelsUnique.size).toFixed(1) : "1.0",
        totalArquivos: allEntregas.length,
        modelosComEntrega: 0,
        comRvt: 0,
        semRvt: 0,
        modelosValidados: 0,
        modelosRecebidos: 0,
        modelosPendentes: 0,
        taxaAprovacao: 0,
        statsPorDisciplina: [] as any[],
        statsPorEmpresa: [] as any[],
        timelineRecebimento: [] as any[],
    };

    const timelineMap = new Map<string, number>();
    const sortedEntregas = allEntregas
        .filter((e: any) => e.dataRecebimento)
        .sort((a: any, b: any) => new Date(a.dataRecebimento).getTime() - new Date(b.dataRecebimento).getTime());

    if (sortedEntregas.length > 0) {
        const firstDate = new Date(sortedEntregas[0].dataRecebimento);
        const refDate = startOfWeek(firstDate);

        sortedEntregas.forEach((e: any) => {
            const date = new Date(e.dataRecebimento);
            const weeksElapsed = differenceInCalendarWeeks(date, refDate);
            const biWeekNum = Math.floor(weeksElapsed / 2);

            const periodStart = addWeeks(refDate, biWeekNum * 2);
            const key = format(periodStart, "dd/MM");
            timelineMap.set(key, (timelineMap.get(key) || 0) + 1);
        });
    }

    result.timelineRecebimento = Array.from(timelineMap.entries()).map(([mes, count]) => ({
        mes,
        count,
    }));

    const entregasComResultado = allEntregas.filter(
        (e: any) => e.status === "VALIDADO" || e.status === "EM_REVISAO"
    );
    const entregasConformes = allEntregas.filter((e: any) => e.status === "VALIDADO");
    result.taxaAprovacao =
        entregasComResultado.length > 0
            ? (entregasConformes.length / entregasComResultado.length) * 100
            : 0;

    const disciplinaMap = new Map<string, { validado: number; recebido: number; pendente: number }>();
    const empresaMap = new Map<string, { total: number; concluido: number }>();

    escopos.forEach((escopo: any) => {
        const entregas = entregasMap.get(escopo.id) || [];
        const hasValidado = entregas.some((e: any) => e.status === "VALIDADO");
        const hasEntrega = entregas.length > 0;
        const hasEmAndamento = hasEntrega && !hasValidado;

        if (hasEntrega) result.modelosComEntrega++;

        if (hasValidado) {
            result.modelosValidados++;
        } else if (hasEmAndamento) {
            result.modelosRecebidos++;
        } else {
            result.modelosPendentes++;
        }

        if (escopo.temRvtOriginal === 1) {
            result.comRvt++;
        } else {
            result.semRvt++;
        }

        let disc = (escopo.disciplina || "Geral").trim();
        if (disc === "Média Tensão e Barramento") disc = "Média Tensão e Barramentos";

        if (!disciplinaMap.has(disc))
            disciplinaMap.set(disc, { validado: 0, recebido: 0, pendente: 0 });
        const dStats = disciplinaMap.get(disc)!;
        if (hasValidado) dStats.validado++;
        else if (hasEmAndamento) dStats.recebido++;
        else dStats.pendente++;

        const emp = escopo.empresa || "Outros";
        if (!empresaMap.has(emp)) empresaMap.set(emp, { total: 0, concluido: 0 });
        const eStats = empresaMap.get(emp)!;
        eStats.total++;
        if (hasValidado) eStats.concluido++;
    });

    result.statsPorDisciplina = Array.from(disciplinaMap.entries())
        .map(([name, stats]) => ({
            name,
            ...stats,
            total: stats.validado + stats.recebido + stats.pendente,
        }))
        .sort((a, b) => b.total - a.total);

    result.statsPorEmpresa = Array.from(empresaMap.entries())
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            concluido: stats.concluido,
            percent: stats.total > 0 ? (stats.concluido / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.percent - a.percent);

    return {
        ...result,
        percentualCobertura:
            result.totalModelos > 0 ? (result.modelosValidados / result.totalModelos) * 100 : 0,
        percentualEntregasIniciadas:
            result.totalModelos > 0 ? (result.modelosComEntrega / result.totalModelos) * 100 : 0,
    };
}

async function getEntregasPorEscopo(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return { entregasMap: new Map(), allEntregas: [] };

    let q = db
        .select({ entregasAsBuilt })
        .from(entregasAsBuilt)
        .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
        .where(eq(escopoAsBuilt.projectId, projectId));

    if (edificacao) {
        q = db
            .select({ entregasAsBuilt })
            .from(entregasAsBuilt)
            .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
            .where(
                and(
                    eq(escopoAsBuilt.projectId, projectId),
                    sql`${entregasAsBuilt.edificacao} ILIKE ${"%" + edificacao + "%"}`
                )
            ) as any;
    }
    const raw = await q;
    const allEntregas = raw.map((r: any) => r.entregasAsBuilt);

    const entregasMap = new Map<number, any[]>();
    allEntregas.forEach((e: any) => {
        const id = e.escopoId;
        if (id) {
            if (!entregasMap.has(id)) entregasMap.set(id, []);
            entregasMap.get(id)?.push(e);
        }
    });

    return { entregasMap, allEntregas };
}
