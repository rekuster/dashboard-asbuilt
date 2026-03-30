
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { getDb, apontamentos, salas } from './db';
import { eq, and, gte, lte } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

/**
 * Mapeia as siglas das disciplinas para seus nomes completos.
 */
function getDisciplineFullName(sigla: string): string {
    const mapping: Record<string, string> = {
        'ELE': 'ELÉTRICA',
        'HID': 'HIDROSSANITÁRIO',
        'EST': 'ESTRUTURA DE CONCRETO',
        'ARQ': 'ARQUITETURA',
        'UTI': 'UTILIDADES',
        'AUT': 'AUTOMAÇÃO',
        'PCI': 'PCI',
        'SDAI': 'SDAI',
        'SPDA': 'SPDA',
        'MET': 'ESTRUTURA METÁLICA',
        'CLI': 'CLIMATIZAÇÃO',
        'LOG': 'CFTV E LÓGICA'
    };
    return mapping[sigla.toUpperCase()] || sigla.toUpperCase();
}

/**
 * Função para desenhar a capa do relatório.
 */
async function drawCoverPage(doc: any, logoPath: string, hasLogo: boolean, edificacao?: string, startDate?: string, endDate?: string) {
    const coverPath = path.resolve(__dirname, '..', 'Tema Layout interface Stecla', 'Layout Capa.png');
    
    if (fs.existsSync(coverPath)) {
        doc.image(coverPath, 0, 0, { width: 842, height: 595 });
    } else {
        // Fallback se a imagem da capa não existir
        doc.save();
        doc.translate(700, 100);
        doc.rotate(-35);
        doc.fillColor('#D1D5DB').roundedRect(-200, -150, 500, 300, 40).fill();
        doc.restore();

        doc.save();
        doc.translate(600, 550);
        doc.rotate(-45);
        doc.fillColor('#A31D1D').roundedRect(-150, -150, 300, 300, 40).fill();
        doc.restore();
    }

    // Título Principal
    doc.fillColor('#444444').fontSize(40).font('Helvetica-Bold').text('RELATÓRIO DE DIVERGÊNCIAS', 60, 320);

    // Informações da Obra
    doc.fillColor('#666666').fontSize(18).font('Helvetica');
    doc.text('Cliente: NEODENT', 60, 380);
    
    // Obra com Edificação (se houver)
    const obraText = edificacao && edificacao !== "Todas" ? `Obra: SUPERNOVA - ${edificacao}` : 'Obra: SUPERNOVA';
    doc.text(obraText, 60, 405);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('pt-BR');
        } catch {
            return dateStr;
        }
    };

    let periodText = "";
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    if (start && end) {
        periodText = `${start} - ${end}`;
    } else if (start) {
        periodText = `A partir de ${start}`;
    } else {
        periodText = new Date().toLocaleDateString('pt-BR');
    }

    doc.text(`Atualização: [${periodText}]`, 60, 450);

    // Logo no canto inferior esquerdo
    if (hasLogo) {
        const logoVertical = logoPath.replace('versão horizontal.png', 'versão vertical.png');
        const logoPathToUse = fs.existsSync(logoVertical) ? logoVertical : logoPath;
        doc.image(logoPathToUse, 60, 500, { width: 140 });
    }

    doc.fillColor('#666666').fontSize(16).text('2026', 780, 540);
    doc.addPage();
}

/**
 * Função para desenhar a página separadora de disciplina.
 */
async function drawDisciplineSeparator(doc: any, disciplina: string) {
    const separatorPath = path.resolve(__dirname, '..', 'Tema Layout interface Stecla', 'Layout Disciplina.png');
    
    if (fs.existsSync(separatorPath)) {
        doc.image(separatorPath, 0, 0, { width: 842, height: 595 });
    } else {
        // Fallback se a imagem não existir
        doc.rect(0, 0, 842, 595).fill('#A31D1D');
    }

    const fullName = getDisciplineFullName(disciplina);

    doc.fillColor('#FFFFFF').fontSize(36).font('Helvetica-Bold').text(fullName.toUpperCase(), 0, 280, {
        align: 'center',
        width: 842
    });

    doc.addPage();
}

/**
 * Função para desenhar a página de sumário (índice) das salas no relatório.
 */
async function drawSummaryPage(doc: any, data: any[], backgroundPath: string, hasBackground: boolean) {
    if (hasBackground) {
        doc.image(backgroundPath, 0, 0, { width: 842, height: 595 });
    }

    // Barra Lateral Vermelha
    doc.fillColor('#A31D1D').roundedRect(0, 55, 65, 485, 15).fill();

    // Título do Sumário
    doc.fillColor('#444444').fontSize(10).font('Helvetica').text('REALIDADE AUMENTADA', 85, 40);
    doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold').text('SUMÁRIO E ÍNDICE REMISSIVO', 85, 55);

    // 1. Índice de Disciplinas
    doc.fontSize(12).font('Helvetica-Bold').text('ÍNDICE POR DISCIPLINA', 85, 105);
    const uniqueDisciplines: string[] = Array.from(new Set(data.map(i => i.apontamento.disciplina || 'OUTROS'))).sort();
    
    let currentY = 120;
    uniqueDisciplines.forEach(disc => {
        const fullName = getDisciplineFullName(disc);
        doc.fontSize(10).font('Helvetica').text(`${fullName.toUpperCase()}`, 85, currentY);
        currentY += 15;
    });

    // 2. Lista de Salas (Ordenada)
    currentY += 20;
    doc.fontSize(12).font('Helvetica-Bold').text('RELAÇÃO DE SALAS COM APONTAMENTOS', 85, currentY);
    currentY += 20;

    const uniqueSalas = data
        .filter((v, i, a) => a.findIndex(t => t.numeroSala === v.numeroSala) === i)
        .sort((a, b) => {
            const salaA = String(a.numeroSala || "0");
            const salaB = String(b.numeroSala || "0");
            return salaA.localeCompare(salaB, undefined, { numeric: true, sensitivity: 'base' });
        });
    
    const startX = 85;
    const startY = currentY + 10;
    const colWidth = 170;
    const rowHeight = 15;
    const maxRows = 22;

    doc.fontSize(9).font('Helvetica').fillColor('#333333');

    uniqueSalas.forEach((item, index) => {
        const col = Math.floor(index / maxRows);
        const row = index % maxRows;
        
        const x = startX + (col * (colWidth + 10));
        const y = startY + (row * rowHeight);

        if (col < 4) {
            doc.text(`${item.numeroSala} - ${item.salaNome}`, x, y, { width: colWidth, ellipsis: true });
        }
    });

    doc.addPage();
}

/**
 * Gera o relatório de divergências em PDF.
 * Inclui o layout fundo padrão e ajusta a exibição conforme a orientação das imagens.
 */
export async function generatePDFReport(filters?: { 
    edificacao?: string; 
    disciplina?: string; 
    responsavel?: string; 
    sala?: string; 
    pavimento?: string;
    startDate?: string;
    endDate?: string;
    apenasNaoEnviados?: boolean;
}): Promise<Buffer> {
    const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
        layout: 'landscape'
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    // Busca os apontamentos vinculados às salas
    let query = database.select({
        apontamento: apontamentos,
        numeroSala: salas.numeroSala,
        salaNome: salas.nome,
        imagemPlantaUrl: salas.imagemPlantaUrl
    })
        .from(apontamentos)
        .innerJoin(salas, eq(apontamentos.sala, salas.nome));

    const conditions: any[] = [];

    if (filters?.edificacao && filters.edificacao !== "Todas") {
        conditions.push(eq(apontamentos.edificacao, filters.edificacao));
    }

    if (filters?.pavimento && filters.pavimento !== "Todos") {
        conditions.push(eq(apontamentos.pavimento, filters.pavimento));
    }

    if (filters?.startDate) {
        conditions.push(gte(apontamentos.data, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
        conditions.push(lte(apontamentos.data, new Date(filters.endDate)));
    }

    if (filters?.apenasNaoEnviados) {
        conditions.push(eq(apontamentos.enviado, 0));
    }

    if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
    }

    let data = await query;

    // Filtros adicionais via JavaScript
    if (filters) {
        if (filters.disciplina && filters.disciplina !== "Todas") {
            data = data.filter((i: any) => 
                (i.apontamento.disciplina || "").toUpperCase() === filters.disciplina?.toUpperCase()
            );
        }
        if (filters.responsavel && filters.responsavel !== "Todos") {
            data = data.filter((i: any) => 
                (i.apontamento.responsavel || "").toUpperCase() === filters.responsavel?.toUpperCase()
            );
        }
        if (filters.sala) {
            const search = filters.sala.toLowerCase();
            data = data.filter((i: any) =>
                (i.numeroSala || "").toLowerCase().includes(search) ||
                (i.salaNome || "").toLowerCase().includes(search)
            );
        }
    }

    // Ordenação solicitada: Disciplina / Edificação / Pavimento / Salas
    data.sort((a: any, b: any) => {
        // 1. Disciplina
        const discA = a.apontamento.disciplina || "";
        const discB = b.apontamento.disciplina || "";
        const compDisc = discA.localeCompare(discB);
        if (compDisc !== 0) return compDisc;

        // 2. Edificação
        const edA = a.apontamento.edificacao || "";
        const edB = b.apontamento.edificacao || "";
        const compEd = edA.localeCompare(edB);
        if (compEd !== 0) return compEd;

        // 3. Pavimento
        const pavA = a.apontamento.pavimento || "";
        const pavB = b.apontamento.pavimento || "";
        const compPav = pavA.localeCompare(pavB);
        if (compPav !== 0) return compPav;

        // 4. Setor (ADICIONADO)
        const setA = a.apontamento.setor || "";
        const setB = b.apontamento.setor || "";
        const compSet = setA.localeCompare(setB);
        if (compSet !== 0) return compSet;

        // 5. Salas (Número)
        // Usamos localeCompare com numeric: true para ordenar 1, 2, 10 corretamente
        const salaA = String(a.numeroSala || "0");
        const salaB = String(b.numeroSala || "0");
        return salaA.localeCompare(salaB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const logoPath = path.resolve(__dirname, '..', 'client', 'public', 'logos_stecla', 'versão horizontal.png');
    const backgroundPath = path.resolve(__dirname, '..', 'Tema Layout interface Stecla', 'Layout Fundo.png');
    const hasLogo = fs.existsSync(logoPath);
    const hasBackground = fs.existsSync(backgroundPath);

    if (data.length === 0) {
        doc.fontSize(20).text('Nenhum apontamento encontrado.', 0, 200, { align: 'center' });
    } else {
        await drawCoverPage(doc, logoPath, hasLogo, filters?.edificacao, filters?.startDate, filters?.endDate);
        
        // Nova Página: Sumário de Salas
        doc.addPage();
        await drawSummaryPage(doc, data, backgroundPath, hasBackground);

        let currentDiscipline = "";

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            
            // Lógica de Separador de Disciplina
            const itemDiscipline = (item.apontamento.disciplina || "OUTROS").toUpperCase();
            if (itemDiscipline !== currentDiscipline) {
                // Sempre garante uma nova página antes do divisor
                doc.addPage();
                await drawDisciplineSeparator(doc, itemDiscipline);
                currentDiscipline = itemDiscipline;
                // O conteúdo do primeiro item da disciplina virá na página adicionada por drawDisciplineSeparator
            } else {
                // Mesma disciplina, apenas adiciona página para o próximo item
                doc.addPage();
            }

            // --- Fundo e Layout ---
            if (hasBackground) {
                doc.image(backgroundPath, 0, 0, { width: 842, height: 595 });
            }

            // Barra Lateral Vermelha Arredondada (Imagem 1)
            doc.fillColor('#A31D1D').roundedRect(0, 55, 65, 485, 15).fill();

            // Cabeçalho e Títulos (Imagem 2)
            doc.fillColor('#444444').fontSize(10).font('Helvetica').text('REALIDADE AUMENTADA', 85, 40);
            doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold').text((item.salaNome || 'RELATÓRIO DE DIVERGÊNCIAS').toUpperCase(), 85, 52);
            
            // Info: Edificação, Pavimento e Setor
            const subTitle = `${item.apontamento.edificacao} | ${item.apontamento.pavimento} | ${item.apontamento.setor}`;
            doc.fillColor('#666666').fontSize(10).font('Helvetica').text(subTitle, 85, 78);

            // Número da Sala no Canto Superior Direito
            doc.fillColor('#444444').fontSize(24).font('Helvetica-Bold').text(item.numeroSala, 750, 20);

            // --- Informações Técnicas ---
            const infoX = 610; // Moved from 580 to avoid overlap
            const infoY = 100;
            doc.fillColor('#000000').fontSize(11).font('Helvetica');
            doc.text(`Disciplina: ${getDisciplineFullName(item.apontamento.disciplina)}`, infoX, infoY);
            doc.text(`Responsável: ${item.apontamento.responsavel || 'Não definido'}`, infoX, infoY + 20);

            doc.font('Helvetica-Bold').text('Apontamento:', infoX, infoY + 50);
            doc.font('Helvetica').fontSize(10).text(item.apontamento.divergencia || '', infoX, infoY + 65, { width: 210 });

            // --- Seção de Imagens ---
            const imgY = 110;
            const imgWidth = 240;
            const imgHeight = 350;

            const drawImage = async (url: string | null, x: number, y: number, w: number, h: number, label?: string) => {
                let success = false;
                if (url) {
                    try {
                        let buffer: Buffer | null = null;
                        if (url.startsWith('data:image')) {
                            buffer = Buffer.from(url.split(',')[1], 'base64');
                        } else if (url.startsWith('http')) {
                            const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
                            buffer = Buffer.from(resp.data);
                        } else {
                            const fullPath = path.join(process.cwd(), url.replace(/^\//, ''));
                            if (fs.existsSync(fullPath)) buffer = fs.readFileSync(fullPath);
                        }

                        if (buffer) {
                            doc.image(buffer, x, y, { width: w, height: h, fit: [w, h] });
                            success = true;
                        }
                    } catch (e) {
                        console.error(`Error loading image ${url}:`, e);
                    }
                }

                if (!success && label !== 'PLANTA') {
                    doc.rect(x, y, w, h).stroke('#CCCCCC');
                    doc.fillColor('#999999').fontSize(10).text('Sem imagem', x, y + (h / 2) - 10, { width: w, align: 'center' });
                }

                if (label && label !== 'PLANTA') {
                    doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold').text(label, x, y - 15);
                }
            };

            const refUrl = item.apontamento.fotoReferenciaUrl;
            const rightFotoUrl = item.apontamento.fotoUrl;
            const leftX = 85;

            // Se apenas uma imagem existir, expande para modo "deitado"
            if (!refUrl || !rightFotoUrl) {
                const singleWidth = 480; 
                const urlToUse = refUrl || rightFotoUrl;
                const labelToUse = refUrl ? 'PROJETO RA / MODELO' : 'EXECUÇÃO REAL / OBRA';
                await drawImage(urlToUse, leftX, imgY, singleWidth, imgHeight, labelToUse);
            } else {
                // Duas imagens lado a lado
                await drawImage(refUrl, leftX, imgY, imgWidth, imgHeight, 'PROJETO RA / MODELO');
                await drawImage(rightFotoUrl, leftX + imgWidth + 20, imgY, imgWidth, imgHeight, 'EXECUÇÃO REAL / OBRA');
            }

            // Planta da Sala
            if (item.imagemPlantaUrl) {
                const pX = 610; // Moved from 580 to match info column
                doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold').text('PLANTA SALA', pX, 305);
                await drawImage(item.imagemPlantaUrl, pX, 320, 210, 180, 'PLANTA');
            }

            // Logo Adicional (se não houver fundo)
            if (hasLogo && !hasBackground) {
                doc.image(logoPath, 680, 520, { width: 140 });
            }
        }
    }

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

/**
 * Gera o relatório de verificação As-Built.
 * Também utiliza o novo layout padronizado da empresa.
 */
export async function generateAsBuiltReport(filters?: { 
    edificacao?: string; 
    pavimento?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Buffer> {
    const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
        layout: 'landscape'
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    let query = database.select({
        apontamento: apontamentos,
        numeroSala: salas.numeroSala,
        salaNome: salas.nome,
        salaStatus: salas.status
    })
        .from(apontamentos)
        .innerJoin(salas, eq(apontamentos.sala, salas.nome));

    const conditions: any[] = [];

    if (filters?.edificacao && filters.edificacao !== "Todas") {
        conditions.push(eq(apontamentos.edificacao, filters.edificacao));
    }
    if (filters?.pavimento && filters.pavimento !== "Todos") {
        conditions.push(eq(apontamentos.pavimento, filters.pavimento));
    }
    if (filters?.startDate) {
        conditions.push(gte(apontamentos.data, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
        conditions.push(lte(apontamentos.data, new Date(filters.endDate)));
    }

    if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
    }
    const data = await query;

    const backgroundPath = path.resolve(__dirname, '..', 'Tema Layout interface Stecla', 'Layout Fundo.png');
    const hasBackground = fs.existsSync(backgroundPath);

    if (data.length === 0) {
        doc.fontSize(20).text('Nenhum dado as-built encontrado.', 0, 200, { align: 'center' });
    } else {
        await drawCoverPage(doc, "", false, filters?.edificacao, filters?.startDate, filters?.endDate);

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            doc.addPage();

            if (hasBackground) {
                doc.image(backgroundPath, 0, 0, { width: 842, height: 595 });
            }

            // Barra Lateral Azul para As-Built
            doc.fillColor('#1E3A8A').roundedRect(0, 55, 65, 485, 15).fill();

            doc.fillColor('#444444').fontSize(10).font('Helvetica').text('VERIFICAÇÃO AS BUILT', 85, 40);
            doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold').text(`${item.numeroSala} - ${item.salaNome}`, 85, 52);
            doc.fillColor('#444444').fontSize(24).font('Helvetica-Bold').text(String(i + 1).padStart(3, '0'), 750, 20);

            const imgWidth = 340;
            const imgHeight = 350;

            const drawAsBuiltImage = async (url: string | null, x: number, y: number, height: number = imgHeight) => {
                try {
                    if (url) {
                        let buffer: Buffer | null = null;
                        if (url.startsWith('data:image')) buffer = Buffer.from(url.split(',')[1], 'base64');
                        else if (url.startsWith('http')) {
                            const r = await axios.get(url, { responseType: 'arraybuffer' });
                            buffer = Buffer.from(r.data);
                        } else {
                            const p = path.join(process.cwd(), url.replace(/^\//, ''));
                            if (fs.existsSync(p)) buffer = fs.readFileSync(p);
                        }
                        if (buffer) doc.image(buffer, x, y, { width: imgWidth, height: height, fit: [imgWidth, height] });
                    } else {
                        doc.rect(x, y, imgWidth, height).stroke('#CCCCCC');
                    }
                } catch (e) { console.error(e); }
            };

            await drawAsBuiltImage(item.apontamento.fotoUrl, 85, 110);
            doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold').text('REALIDADE (OBRA)', 85, 95);

            const rightX = 85 + imgWidth + 20;
            await drawAsBuiltImage(item.apontamento.fotoReferenciaUrl, rightX, 110, 220);
            doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold').text('MODELO AS-BUILT', rightX, 95);

            // Legenda e Dados
            const legendY = 340;
            doc.rect(rightX, legendY, 80, 20).fill('#FF0000');
            doc.fillColor('#FFFFFF').fontSize(8).text('PROJETO', rightX + 5, legendY + 6);
            doc.rect(rightX + 90, legendY, 80, 20).fill('#00FF00');
            doc.fillColor('#000000').fontSize(8).text('AS-BUILT', rightX + 95, legendY + 6);

            doc.rect(rightX, legendY + 30, imgWidth, 90).stroke('#DDDDDD');
            doc.fillColor('#1E3A8A').fontSize(10).font('Helvetica-Bold').text('APONTAMENTOS', rightX + 10, legendY + 40);
            doc.fillColor('#000000').fontSize(9).font('Helvetica').text(item.apontamento.divergencia || '', rightX + 10, legendY + 55, { width: imgWidth - 20 });
        }
    }

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

/**
 * Gera o relatório Excel consolidado.
 */
export async function generateExcelReport(edificacao?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    let sQuery = database.select().from(salas);
    if (edificacao) sQuery = sQuery.where(eq(salas.edificacao, edificacao)) as any;
    const rawSalasData = await sQuery;

    const salasData = [...rawSalasData].sort((a, b) => {
        const nA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
        const nB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
        return nA - nB;
    });

    let aQuery = database.select().from(apontamentos);
    if (edificacao) aQuery = aQuery.where(eq(apontamentos.edificacao, edificacao)) as any;
    const apontamentosData = await aQuery;

    // Planilha 1: Mapeamento
    const sheetMapeamento = workbook.addWorksheet('Mapeamento Salas');
    sheetMapeamento.columns = [
        { header: 'Edificação', key: 'edificacao', width: 20 },
        { header: 'Pavimento', key: 'pavimento', width: 15 },
        { header: 'Setor', key: 'setor', width: 15 },
        { header: 'Sala', key: 'sala', width: 25 },
        { header: 'Número Sala', key: 'numeroSala', width: 12 },
        { header: 'statusRA', key: 'statusRA', width: 15 },
    ];
    salasData.forEach((item: any) => {
        sheetMapeamento.addRow({
            edificacao: item.edificacao,
            pavimento: item.pavimento,
            setor: item.setor,
            sala: item.nome,
            numeroSala: item.numeroSala,
            statusRA: item.statusRA || 'PENDENTE'
        });
    });

    // Planilha 2: Apontamentos
    const sheetApontamentos = workbook.addWorksheet('Apontamentos RA Obra');
    sheetApontamentos.columns = [
        { header: 'Data', key: 'data', width: 15 },
        { header: 'Número', key: 'numeroApontamento', width: 10 },
        { header: 'Sala', key: 'sala', width: 25 },
        { header: 'Disciplina', key: 'disciplina', width: 15 },
        { header: 'Divergência', key: 'divergencia', width: 50 },
    ];
    apontamentosData.forEach((item: any) => {
        sheetApontamentos.addRow({
            data: item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '',
            numeroApontamento: item.numeroApontamento,
            sala: item.sala,
            disciplina: item.disciplina,
            divergencia: item.divergencia
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
