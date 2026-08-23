import { eq, and, sql, desc } from "drizzle-orm";
import { getDb, salas, apontamentos, verificacaoModelo, escopoAsBuilt, entregasAsBuilt, constatacoesTecnicas } from "../../common/db";
import { format, startOfWeek, differenceInCalendarWeeks, addWeeks } from "date-fns";

export async function getKPIs(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    const sConditions = [eq(salas.projectId, projectId)];
    const aConditions = [eq(apontamentos.projectId, projectId)];

    if (edificacao && edificacao !== "Todas") {
        sConditions.push(eq(salas.edificacao, edificacao));
        aConditions.push(eq(apontamentos.edificacao, edificacao));
    }

    const [allSalas, allApontamentos] = await Promise.all([
        db
            .select({
                id: salas.id,
                status: salas.status,
                statusRA: salas.statusRA,
                dataVerificada: salas.dataVerificada,
                temForro: salas.temForro,
            })
            .from(salas)
            .where(and(...sConditions)),
        db
            .select({
                id: apontamentos.id,
                sala: apontamentos.sala,
            })
            .from(apontamentos)
            .where(and(...aConditions)),
    ]);

    const totalSalas = allSalas.length;
    const totalApontamentos = allApontamentos.length;

    const salasVerificadas = allSalas.filter((s: any) => {
        const val = s.status?.trim().toUpperCase();
        return val === "VERIFICADA" || val === "REVISAR" || val === "EM REVISÃO";
    }).length;

    const salasLiberadas = allSalas.filter((s: any) => {
        const val = s.statusRA?.trim().toUpperCase();
        return val && (val === "LIBERADO PARA OBRA" || val === "LIBERADO" || val.includes("LIBERADO"));
    }).length;

    const issuesPerRoom = new Map<string, number>();
    allApontamentos.forEach((a: any) => {
        issuesPerRoom.set(a.sala, (issuesPerRoom.get(a.sala) || 0) + 1);
    });

    let salasCriticas = 0;
    issuesPerRoom.forEach((count) => {
        if (count > 10) salasCriticas++;
    });

    const limitDays = 30;
    const agora = Date.now();
    const limitePast = agora - limitDays * 24 * 60 * 60 * 1000;

    let globDatasRecentes: number[] = [];
    if (!edificacao || edificacao === "Todas") {
        globDatasRecentes = allSalas
            .map((s: any) => (s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0))
            .filter((time: number) => time > limitePast);
    } else {
        const globSalas = await db
            .select({ dataVerificada: salas.dataVerificada })
            .from(salas)
            .where(eq(salas.projectId, projectId));
        globDatasRecentes = globSalas
            .map((s: any) => (s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0))
            .filter((time: number) => time > limitePast);
    }

    let velocidadeVerificacao = 0;
    if (globDatasRecentes.length > 0) {
        const minDataRecente = Math.min(...globDatasRecentes);
        const diasAtivos = Math.max(1, (agora - minDataRecente) / (1000 * 60 * 60 * 24));
        velocidadeVerificacao = globDatasRecentes.length / diasAtivos;
    }

    let estimativaTermino: string | null = null;

    if (velocidadeVerificacao > 0 && salasVerificadas < totalSalas) {
        const salasRestantes = totalSalas - salasVerificadas;
        const diasRestantes = salasRestantes / velocidadeVerificacao;
        const dateTermino = new Date(agora + diasRestantes * 1000 * 60 * 60 * 24);
        estimativaTermino = dateTermino.toISOString();
    } else if (salasVerificadas >= totalSalas && totalSalas > 0) {
        estimativaTermino = new Date(agora).toISOString();
    }

    const salasComForro = allSalas.filter((s: any) => !!s.temForro).length;

    const salasVerificadasComForro = allSalas.filter((s: any) => {
        const isVerificada = ["VERIFICADA", "REVISAR", "EM REVISÃO"].includes(
            (s.status || "").trim().toUpperCase()
        );
        return !!s.temForro && isVerificada;
    }).length;

    return {
        totalSalas,
        salasVerificadas,
        salasLiberadas,
        totalApontamentos,
        salasCriticas,
        taxaVerificacao: totalSalas > 0 ? (salasVerificadas / totalSalas) * 100 : 0,
        taxaLiberacao: totalSalas > 0 ? (salasLiberadas / totalSalas) * 100 : 0,
        taxaCriticidade: totalSalas > 0 ? (salasCriticas / totalSalas) * 100 : 0,
        mediaApontamentos: salasVerificadas > 0 ? totalApontamentos / salasVerificadas : 0,
        estimativaTermino,
        velocidadeVerificacao,
        salasComForro,
        salasVerificadasComForro,
        percentualForroVerificadas:
            salasComForro > 0 ? (salasVerificadasComForro / salasComForro) * 100 : 0,
    };
}

export async function getKPIsPorEdificacao(projectId: string, edificacao: string) {
    return await getKPIs(projectId, edificacao);
}

export async function getTendenciaVerificacao(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(salas.projectId, projectId)];
    if (edificacao && edificacao !== "Todas") {
        conditions.push(eq(salas.edificacao, edificacao));
    }

    const allSalas = await db
        .select({ dataVerificada: salas.dataVerificada })
        .from(salas)
        .where(and(...conditions));
    const totalSalas = allSalas.length;

    const datasValidas = allSalas
        .map((s: any) => (s.dataVerificada ? new Date(s.dataVerificada) : null))
        .filter((d: any) => d !== null) as Date[];

    datasValidas.sort((a, b) => a.getTime() - b.getTime());

    const agrupamento: { [dateStr: string]: number } = {};
    let countRealizado = 0;

    datasValidas.forEach((d) => {
        const diaStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}`;
        countRealizado++;
        agrupamento[diaStr] = countRealizado;
    });

    const resultadoFinal: any[] = [];

    for (const data in agrupamento) {
        const dOriginal = datasValidas.reverse().find(
            (d) =>
                `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}` === data
        );
        datasValidas.reverse();

        resultadoFinal.push({
            name: data,
            timestamp: dOriginal?.getTime() || null,
            Realizado: agrupamento[data],
            Projetado: null,
        });
    }

    if (resultadoFinal.length > 0 && countRealizado < totalSalas) {
        const limitDays = 30;
        const agora = Date.now();
        const limitePast = agora - limitDays * 24 * 60 * 60 * 1000;

        let globDatasRecentes: number[] = [];
        if (!edificacao || edificacao === "Todas") {
            globDatasRecentes = allSalas
                .map((s: any) => (s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0))
                .filter((time: number) => time > limitePast);
        } else {
            const globSalas = await db
                .select({ dataVerificada: salas.dataVerificada })
                .from(salas)
                .where(eq(salas.projectId, projectId));
            globDatasRecentes = globSalas
                .map((s: any) => (s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0))
                .filter((time: number) => time > limitePast);
        }

        if (globDatasRecentes.length > 0) {
            const minDataRecente = Math.min(...globDatasRecentes);
            const diasAtivos = Math.max(1, (agora - minDataRecente) / (1000 * 60 * 60 * 24));
            const velocidade = globDatasRecentes.length / diasAtivos;

            const ultimoRegistro = resultadoFinal[resultadoFinal.length - 1];
            ultimoRegistro.Projetado = ultimoRegistro.Realizado;

            const salasRestantes = totalSalas - countRealizado;
            const diasFaltantes = salasRestantes / velocidade;

            if (diasFaltantes > 2) {
                const tsMeio = agora + (diasFaltantes / 2) * 1000 * 60 * 60 * 24;
                const dataMeio = new Date(tsMeio);
                const labelMeio = `${dataMeio.getDate().toString().padStart(2, "0")}/${(
                    dataMeio.getMonth() + 1
                )
                    .toString()
                    .padStart(2, "0")}/${dataMeio.getFullYear().toString().slice(-2)}`;
                if (!resultadoFinal.find((r) => r.name === labelMeio)) {
                    resultadoFinal.push({
                        name: labelMeio,
                        timestamp: tsMeio,
                        Realizado: null,
                        Projetado: Math.round(countRealizado + salasRestantes / 2),
                    });
                }
            }

            const tsFim = agora + diasFaltantes * 1000 * 60 * 60 * 24;
            const dataFim = new Date(tsFim);
            const labelFim = `${dataFim.getDate().toString().padStart(2, "0")}/${(dataFim.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${dataFim.getFullYear().toString().slice(-2)}`;
            if (!resultadoFinal.find((r) => r.name === labelFim)) {
                resultadoFinal.push({
                    name: labelFim,
                    timestamp: tsFim,
                    Realizado: null,
                    Projetado: totalSalas,
                });
            } else {
                const match = resultadoFinal.find((r) => r.name === labelFim);
                if (match) {
                    match.Projetado = totalSalas;
                    match.timestamp = tsFim;
                }
            }
        }
    }

    return resultadoFinal;
}

export async function getTendenciaVerificacaoPorEdificacao(projectId: string, edificacao: string) {
    return await getTendenciaVerificacao(projectId, edificacao);
}

export async function getStatsStatus(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    const sConditions = [eq(salas.projectId, projectId)];
    const aConditions = [eq(apontamentos.projectId, projectId)];

    if (edificacao && edificacao !== "Todas") {
        sConditions.push(eq(salas.edificacao, edificacao));
        aConditions.push(eq(apontamentos.edificacao, edificacao));
    }

    const [allRooms] = await Promise.all([
        db.select({ status: salas.status }).from(salas).where(and(...sConditions)),
        db.select({ sala: apontamentos.sala }).from(apontamentos).where(and(...aConditions)),
    ]);

    const stats = { Verificada: 0, Revisar: 0, Pendente: 0 };

    allRooms.forEach((room: any) => {
        const status = (room.status || "").trim().toUpperCase();

        if (status === "VERIFICADA") {
            stats.Verificada++;
        } else if (status === "EM REVISÃO" || status === "REVISAR") {
            stats.Revisar++;
        } else {
            stats.Pendente++;
        }
    });

    return [
        { status: "Verificada", count: stats.Verificada, color: "#22C55E" },
        { status: "Revisar", count: stats.Revisar, color: "#EAB308" },
        { status: "Pendente", count: stats.Pendente, color: "#9CA3AF" },
    ];
}

export async function getTopSalasImpactadas(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(apontamentos.projectId, projectId)];
    if (edificacao && edificacao !== "Todas") {
        conditions.push(eq(apontamentos.edificacao, edificacao));
    }

    return await db
        .select({
            sala: apontamentos.sala,
            count: sql<number>`count(*)`,
            edificacao: apontamentos.edificacao,
        })
        .from(apontamentos)
        .where(and(...conditions))
        .groupBy(apontamentos.sala, apontamentos.edificacao)
        .orderBy(desc(sql`count(*)`))
        .limit(5);
}

export async function getApontamentosPorSala(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    const results = await db
        .select({
            sala: apontamentos.sala,
            count: sql<number>`count(*)`,
        })
        .from(apontamentos)
        .where(eq(apontamentos.projectId, projectId))
        .groupBy(apontamentos.sala)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

    return results.map((r: any) => ({ ...r, count: Number(r.count) }));
}

export async function getApontamentosPorDisciplina(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    const disciplinaCol = sql<string>`COALESCE(${apontamentos.disciplina}, 'Não Informada')`;

    const conditions = [eq(apontamentos.projectId, projectId)];
    if (edificacao && edificacao !== "Todas") {
        conditions.push(eq(apontamentos.edificacao, edificacao));
    }

    const results = await db
        .select({
            disciplina: disciplinaCol,
            count: sql<number>`count(*)`,
        })
        .from(apontamentos)
        .where(and(...conditions))
        .groupBy(disciplinaCol)
        .orderBy(desc(sql`count(*)`));

    return results.map((r: any) => ({
        disciplina: r.disciplina,
        count: Number(r.count),
    }));
}

export async function getValidacaoIntegridade(projectId: string) {
    const db = await getDb();
    if (!db) return null;

    const apontamentosResult = await db
        .select({
            sala: apontamentos.sala,
            edificacao: apontamentos.edificacao,
            count: sql<number>`count(*)`,
        })
        .from(apontamentos)
        .where(eq(apontamentos.projectId, projectId))
        .groupBy(apontamentos.sala, apontamentos.edificacao);

    const salasResult = await db
        .select({ nome: salas.nome })
        .from(salas)
        .where(eq(salas.projectId, projectId));
    const salasMapeadas = new Set(salasResult.map((s: any) => s.nome));

    const naoMapeados = apontamentosResult.filter((a: any) => !salasMapeadas.has(a.sala));
    const totalApontamentosNaoMapeados = naoMapeados.reduce(
        (sum: number, item: any) => sum + Number(item.count),
        0
    );

    return {
        temProblemas: totalApontamentosNaoMapeados > 0,
        totalApontamentosNaoMapeados,
        totalSalasNaoMapeadas: naoMapeados.length,
        apontamentosNaoMapeados: naoMapeados.map((item: any) => ({
            sala: item.sala,
            edificacao: item.edificacao,
            totalApontamentos: Number(item.count),
        })),
    };
}

export async function getApontamentosPorSemana(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    const weekFormat = sql<string>`to_char(${apontamentos.data}, 'IYYY-"W"IW')`;
    const getWeekFormat = (col: any) => sql<string>`to_char(${col}, 'IYYY-"W"IW')`;

    const aConditions = [eq(apontamentos.projectId, projectId)];
    const s1Conditions = [sql`${salas.dataVerificada} IS NOT NULL`, eq(salas.projectId, projectId)];
    const s2Conditions = [sql`${salas.dataVerificacao2} IS NOT NULL`, eq(salas.projectId, projectId)];

    if (edificacao && edificacao !== "Todas") {
        aConditions.push(eq(apontamentos.edificacao, edificacao));
        s1Conditions.push(eq(salas.edificacao, edificacao));
        s2Conditions.push(eq(salas.edificacao, edificacao));
    }

    const [weeklyApontamentos, weeklyV1, weeklyV2] = await Promise.all([
        db
            .select({
                semana: weekFormat,
                count: sql<number>`count(*)`,
            })
            .from(apontamentos)
            .where(and(...aConditions))
            .groupBy(weekFormat),

        db
            .select({
                semana: getWeekFormat(salas.dataVerificada),
                count: sql<number>`count(*)`,
            })
            .from(salas)
            .where(and(...s1Conditions))
            .groupBy(getWeekFormat(salas.dataVerificada)),

        db
            .select({
                semana: getWeekFormat(salas.dataVerificacao2),
                count: sql<number>`count(*)`,
            })
            .from(salas)
            .where(and(...s2Conditions))
            .groupBy(getWeekFormat(salas.dataVerificacao2)),
    ]);

    const weeksMap = new Map<string, { semana: string; count: number; verifiedRooms: number }>();

    weeklyApontamentos.forEach((a: any) => {
        weeksMap.set(a.semana, { semana: a.semana, count: Number(a.count), verifiedRooms: 0 });
    });

    weeklyV1.forEach((v: any) => {
        const existing = weeksMap.get(v.semana);
        if (existing) {
            existing.verifiedRooms += Number(v.count);
        } else {
            weeksMap.set(v.semana, { semana: v.semana, count: 0, verifiedRooms: Number(v.count) });
        }
    });

    weeklyV2.forEach((v: any) => {
        const existing = weeksMap.get(v.semana);
        if (existing) {
            existing.verifiedRooms += Number(v.count);
        } else {
            weeksMap.set(v.semana, { semana: v.semana, count: 0, verifiedRooms: Number(v.count) });
        }
    });

    const weekRegex = /^\d{4}-W\d{2}$/;

    return Array.from(weeksMap.values())
        .map((w) => ({
            semana: w.semana || "Sem Data",
            count: Number(w.count),
            verifiedRooms: Number(w.verifiedRooms),
        }))
        .filter((w) => weekRegex.test(w.semana))
        .sort((a, b) => a.semana.localeCompare(b.semana));
}

export async function getStatsPorDisciplina(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    const allVerificacoes = await db
        .select({ verificacaoModelo })
        .from(verificacaoModelo)
        .innerJoin(salas, eq(verificacaoModelo.salaId, salas.id))
        .where(eq(salas.projectId, projectId))
        .then((rows: any[]) => rows.map((r: any) => r.verificacaoModelo));

    const aConditions = [eq(apontamentos.projectId, projectId), eq(apontamentos.status, "ATIVA")];
    const sConditions = [eq(salas.projectId, projectId)];

    if (edificacao && edificacao !== "Todas") {
        aConditions.push(eq(apontamentos.edificacao, edificacao));
        sConditions.push(eq(salas.edificacao, edificacao));
    }

    const [allActiveApontamentos, allSalas] = await Promise.all([
        db.select().from(apontamentos).where(and(...aConditions)),
        db.select().from(salas).where(and(...sConditions)),
    ]);

    const totalSalasCount = allSalas.length;

    const statsMap: Record<string, any> = {};
    const disciplinas = [...new Set(allVerificacoes.map((v: any) => v.disciplina))];

    if (disciplinas.length === 0) {
        ["Hidrossanitário", "Elétrica", "HVAC", "Incêndio", "Gás", "Estrutura"].forEach((d) => {
            statsMap[d] = {
                disciplina: d,
                totalRooms: totalSalasCount,
                okRooms: 0,
                roomsComDivergencia: 0,
                percentOk: 0,
            };
        });
    } else {
        disciplinas.forEach((d: any) => {
            statsMap[d as string] = {
                disciplina: d as string,
                totalRooms: totalSalasCount,
                okRooms: 0,
                roomsComDivergencia: 0,
                percentOk: 0,
            };
        });
    }

    allVerificacoes.forEach((v: any) => {
        if (statsMap[v.disciplina] && v.status === "OK") {
            statsMap[v.disciplina].okRooms++;
        }
    });

    const salasComDivergenciaPorDisc: Record<string, Set<string>> = {};
    allActiveApontamentos.forEach((a: any) => {
        if (!salasComDivergenciaPorDisc[a.disciplina]) {
            salasComDivergenciaPorDisc[a.disciplina] = new Set();
        }
        salasComDivergenciaPorDisc[a.disciplina].add(a.sala);
    });

    Object.keys(salasComDivergenciaPorDisc).forEach((disc) => {
        if (statsMap[disc]) {
            statsMap[disc].roomsComDivergencia = salasComDivergenciaPorDisc[disc].size;
        }
    });

    return Object.values(statsMap).map((s: any) => ({
        ...s,
        percentOk: s.totalRooms > 0 ? (s.okRooms / s.totalRooms) * 100 : 0,
    }));
}

export async function getAsBuiltModelsSummary(projectId: string, empresa?: string) {
    const db = await getDb();
    if (!db) return null;

    const escConditions: any[] = [eq(escopoAsBuilt.projectId, projectId)];
    if (empresa && empresa !== "Todas" && empresa !== "todas") {
        escConditions.push(sql`LOWER(${escopoAsBuilt.empresa}) = LOWER(${empresa})`);
    }

    const escopos = await db.select().from(escopoAsBuilt).where(and(...escConditions));

    // Busca todas as entregas do projeto
    const allEntregas = await db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, projectId))
        .orderBy(desc(entregasAsBuilt.dataRecebimento));

    // Mapeia entregas por escopoId
    const entregasMap = new Map<number, any[]>();
    allEntregas.forEach((ent: any) => {
        if (ent.escopoId) {
            if (!entregasMap.has(ent.escopoId)) {
                entregasMap.set(ent.escopoId, []);
            }
            entregasMap.get(ent.escopoId)!.push(ent);
        }
    });

    let totalModelos = escopos.length;
    let validados = 0;
    let comPendencias = 0;
    let igualProjeto = 0;
    let naoEntregues = 0;

    // Agrupamento por Edificação
    const edificacaoMap = new Map<string, {
        edificacao: string;
        total: number;
        validado: number;
        pendente: number;
        igualProjeto: number;
        naoEntregue: number;
    }>();

    let ultimaDataRecebida: Date | null = null;

    escopos.forEach((escopo: any) => {
        const edif = (escopo.edificacao || "Geral").trim();
        if (!edificacaoMap.has(edif)) {
            edificacaoMap.set(edif, {
                edificacao: edif,
                total: 0,
                validado: 0,
                pendente: 0,
                igualProjeto: 0,
                naoEntregue: 0,
            });
        }
        const edifStats = edificacaoMap.get(edif)!;
        edifStats.total++;

        const entregasDoEscopo = entregasMap.get(escopo.id) || [];

        if (entregasDoEscopo.length === 0) {
            naoEntregues++;
            edifStats.naoEntregue++;
        } else {
            const latest = entregasDoEscopo[0];
            if (latest.dataRecebimento) {
                const dt = new Date(latest.dataRecebimento);
                if (!ultimaDataRecebida || dt > ultimaDataRecebida) {
                    ultimaDataRecebida = dt;
                }
            }

            const st = (latest.status || "").toUpperCase();
            const res = (latest.resultado || "").toUpperCase();

            if (st === "VALIDADO" || res === "CONFORME") {
                validados++;
                edifStats.validado++;
            } else if (st === "IGUAL_PROJETO" || (escopo.obsTha && escopo.obsTha.toLowerCase().includes("igual ao projeto"))) {
                igualProjeto++;
                edifStats.igualProjeto++;
            } else if (st === "COM_PENDENCIAS" || st === "EM_REVISAO" || st === "REJEITADO" || res === "NAO_CONFORME") {
                comPendencias++;
                edifStats.pendente++;
            } else {
                naoEntregues++;
                edifStats.naoEntregue++;
            }
        }
    });

    const percent = (val: number) => totalModelos > 0 ? Number(((val / totalModelos) * 100).toFixed(2)) : 0;

    const statusPorEdificacao = Array.from(edificacaoMap.values()).sort((a, b) => b.total - a.total);

    // Constatações técnicas dinâmicas do banco por empresa
    const empFilter = empresa && empresa !== "Todas" ? empresa : "Thá";
    const constatacoesDb = await db
        .select()
        .from(constatacoesTecnicas)
        .where(
            and(
                eq(constatacoesTecnicas.projectId, projectId),
                sql`LOWER(${constatacoesTecnicas.empresa}) = LOWER(${empFilter})`
            )
        )
        .orderBy(constatacoesTecnicas.edificacao, constatacoesTecnicas.ordem);

    const groupedMap = new Map<string, { edificacao: string; items: string[]; destaque: boolean }>();
    constatacoesDb.forEach((c) => {
        if (!groupedMap.has(c.edificacao)) {
            groupedMap.set(c.edificacao, {
                edificacao: c.edificacao,
                items: [],
                destaque: false,
            });
        }
        const group = groupedMap.get(c.edificacao)!;
        group.items.push(c.texto);
        if (c.destaque === 1) group.destaque = true;
    });

    let constatacoesResult = Array.from(groupedMap.values());

    // Se a empresa ainda não tiver registros no banco, gera uma estrutura padrão
    if (constatacoesResult.length === 0) {
        if (empFilter.toLowerCase() === "thá" || empFilter.toLowerCase() === "tha") {
            constatacoesResult = [
                {
                    edificacao: "Implantação",
                    items: [
                        "Drenagem foi o único modelo com entregas parciais evolutivas conforme execução.",
                        "Modelos de Estruturas de concreto (bancos, caixas, escadas) não entregues conforme execução.",
                    ],
                    destaque: false,
                },
                {
                    edificacao: "Prédio Suporte",
                    items: [
                        "4 modelos entregues são cópias dos modelos de projeto sem qualquer representação do executado em campo.",
                    ],
                    destaque: true,
                },
                {
                    edificacao: "Portaria",
                    items: ["Nenhuma entrega realizada."],
                    destaque: false,
                },
                {
                    edificacao: "Central de Utilidades",
                    items: [
                        "Modelo de estrutura entregue apenas em .ifc. Estrutura do Pátio de Utilidades não entregue.",
                    ],
                    destaque: false,
                },
                {
                    edificacao: "Prédio Produção",
                    items: [
                        "Modelos de Hidrossanitário são os mais críticos e as entregas não refletem o que foi executado.",
                    ],
                    destaque: true,
                },
            ];
        } else {
            constatacoesResult = [
                {
                    edificacao: "Prédio Produção",
                    items: [
                        "Modelos de Climatização e Gases entregues com pendências pontuais de modelagem em conexões.",
                    ],
                    destaque: false,
                },
                {
                    edificacao: "Central de Utilidades",
                    items: [
                        "Tubulações de utilidades validadas em campo com modelo RVT conforme execução.",
                    ],
                    destaque: false,
                },
                {
                    edificacao: "Implantação",
                    items: [
                        "Rede de média tensão com pendência de validação em caixas de passagem.",
                    ],
                    destaque: true,
                },
            ];
        }
    }

    return {
        totalModelos,
        validados,
        validadosPct: percent(validados),
        comPendencias,
        comPendenciasPct: percent(comPendencias),
        igualProjeto,
        igualProjetoPct: percent(igualProjeto),
        naoEntregues,
        naoEntreguesPct: percent(naoEntregues),
        statusPorEdificacao,
        constatacoes: constatacoesResult,
        ultimaDataRecebida: ultimaDataRecebida ? format(ultimaDataRecebida, "dd/MM/yyyy") : "16/07/2026",
    };
}

export async function getConstatacoes(projectId: string, empresa?: string) {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(constatacoesTecnicas.projectId, projectId)];
    if (empresa && empresa !== "Todas") {
        conditions.push(sql`LOWER(${constatacoesTecnicas.empresa}) = LOWER(${empresa})`);
    }

    return db
        .select()
        .from(constatacoesTecnicas)
        .where(and(...conditions))
        .orderBy(constatacoesTecnicas.empresa, constatacoesTecnicas.edificacao, constatacoesTecnicas.ordem);
}

export async function saveConstatacoes(data: {
    projectId: string;
    empresa: string;
    items: Array<{
        id?: number;
        edificacao: string;
        texto: string;
        destaque?: number;
        ordem?: number;
    }>;
}) {
    const db = await getDb();
    if (!db) return false;

    await db
        .delete(constatacoesTecnicas)
        .where(
            and(
                eq(constatacoesTecnicas.projectId, data.projectId),
                sql`LOWER(${constatacoesTecnicas.empresa}) = LOWER(${data.empresa})`
            )
        );

    for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (!item.texto || !item.texto.trim()) continue;

        await db.insert(constatacoesTecnicas).values({
            projectId: data.projectId,
            empresa: data.empresa,
            edificacao: item.edificacao.trim(),
            texto: item.texto.trim(),
            destaque: item.destaque ? 1 : 0,
            ordem: item.ordem ?? i,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    return true;
}

