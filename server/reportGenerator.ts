
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { getDb, apontamentos, salas } from './db';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

async function drawCoverPage(doc: any, logoPath: string, hasLogo: boolean) {
    // Larger grey shape at top right
    doc.save();
    doc.translate(700, 100);
    doc.rotate(-35);
    doc.fillColor('#D1D5DB').roundedRect(-200, -150, 500, 300, 40).fill();
    doc.restore();

    // Red shape at bottom center-right
    doc.save();
    doc.translate(600, 550);
    doc.rotate(-45);
    doc.fillColor('#A31D1D').roundedRect(-150, -150, 300, 300, 40).fill();
    doc.restore();

    // Main Title
    doc.fillColor('#444444').fontSize(40).font('Helvetica-Bold').text('RELATÓRIO DE DIVERGÊNCIAS', 60, 320);

    // Info
    doc.fillColor('#666666').fontSize(18).font('Helvetica');
    doc.text('Cliente: NEODENT', 60, 380);
    doc.text('Obra: SUPERNOVA', 60, 405);

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Atualização: [${dataAtual}]`, 60, 450);

    // Logo bottom left
    if (hasLogo) {
        // Try vertical version first if it matches image
        const logoVertical = logoPath.replace('versão horizontal.png', 'versão vertical.png');
        const logoPathToUse = fs.existsSync(logoVertical) ? logoVertical : logoPath;
        doc.image(logoPathToUse, 60, 500, { width: 140 });
    }

    // Year bottom right
    doc.fillColor('#666666').fontSize(16).text('2026', 780, 540);

    doc.addPage();
}

export async function generatePDFReport(filters?: { edificacao?: string; disciplina?: string; responsavel?: string; sala?: string; }): Promise<Buffer> {
    const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
        layout: 'landscape'
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    // Query appointments with room number
    let query = database.select({
        apontamento: apontamentos,
        numeroSala: salas.numeroSala,
        salaNome: salas.nome,
        imagemPlantaUrl: salas.imagemPlantaUrl
    })
        .from(apontamentos)
        .innerJoin(salas, eq(apontamentos.sala, salas.nome));

    if (filters?.edificacao && filters.edificacao !== "Todas") {
        query = query.where(eq(apontamentos.edificacao, filters.edificacao)) as any;
    }

    let data = await query;

    // Apply JS filters for non-indexed/complex fields
    if (filters) {
        if (filters.disciplina && filters.disciplina !== "Todas") {
            data = data.filter((i: any) => i.apontamento.disciplina === filters.disciplina);
        }
        if (filters.responsavel && filters.responsavel !== "Todos") {
            data = data.filter((i: any) => i.apontamento.responsavel === filters.responsavel);
        }
        if (filters.sala) {
            const search = filters.sala.toLowerCase();
            data = data.filter((i: any) =>
                (i.numeroSala || "").toLowerCase().includes(search) ||
                (i.salaNome || "").toLowerCase().includes(search)
            );
        }
    }

    // Sorting by room number numerically
    data.sort((a: any, b: any) => {
        const numA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
        return numA - numB;
    });

    const logoPath = path.join(process.cwd(), 'client', 'public', 'logos_stecla', 'versão horizontal.png');
    const hasLogo = fs.existsSync(logoPath);

    if (data.length === 0) {
        doc.fontSize(20).text('Nenhum apontamento encontrado.', 0, 200, { align: 'center' });
    } else {
        // Draw Cover Page
        await drawCoverPage(doc, logoPath, hasLogo);

        // Use for...of loop to handle async image fetching
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const index = i;

            if (index > 0) doc.addPage();

            // ─── Header Section ───
            // Background red strip
            doc.rect(0, 0, 40, 595).fill('#A31D1D'); // Left accent bar

            // Title
            doc.fillColor('#444444').fontSize(12).font('Helvetica').text('REALIDADE AUMENTADA', 60, 40);
            doc.fillColor('#000000').fontSize(24).font('Helvetica-Bold').text((item.salaNome || 'RELATÓRIO DE DIVERGÊNCIAS').toUpperCase(), 60, 55);

            // Page Number -> Room Number
            doc.fillColor('#444444').fontSize(24).font('Helvetica-Bold').text(item.numeroSala, 750, 20);

            // ─── Room & Discipline Info ───
            const infoX = 580;
            const infoY = 100;
            doc.fillColor('#000000').fontSize(12).font('Helvetica');
            doc.text(`Sala: ${item.numeroSala} - ${item.salaNome}`, infoX, infoY);
            doc.text(`Disciplina: ${item.apontamento.disciplina}`, infoX, infoY + 20);
            doc.text(`Responsável: ${item.apontamento.responsavel || 'Não definido'}`, infoX, infoY + 40);

            doc.font('Helvetica-Bold').text('Apontamento:', infoX, infoY + 70);
            doc.font('Helvetica').fontSize(11).text(item.apontamento.divergencia || '', infoX, infoY + 85, { width: 230 });

            // ─── Images Section ───
            const imgY = 110;
            const imgWidth = 240;
            const imgHeight = 350;

            const plantaUrl = item.imagemPlantaUrl;
            const refUrl = item.apontamento.fotoReferenciaUrl;
            const rightFotoUrl = item.apontamento.fotoUrl;

            // Helper to fetch/draw image
            const drawImage = async (url: string | null, x: number, y: number, label: string, labelColor: string) => {
                let success = false;
                if (url) {
                    try {
                        if (url.startsWith('http')) {
                            const response = await axios.get(url, { responseType: 'arraybuffer' });
                            const buffer = Buffer.from(response.data);
                            doc.image(buffer, x, y, { width: imgWidth, height: imgHeight, fit: [imgWidth, imgHeight] });
                            success = true;
                        } else {
                            const fullPath = path.join(process.cwd(), url.replace(/^\//, ''));
                            if (fs.existsSync(fullPath)) {
                                doc.image(fullPath, x, y, { width: imgWidth, height: imgHeight, fit: [imgWidth, imgHeight] });
                                success = true;
                            }
                        }
                    } catch (e) {
                        console.error(`Error loading image ${url}:`, e);
                        // Fallback to error placeholder
                    }
                }

                if (!success) {
                    doc.rect(x, y, imgWidth, imgHeight).stroke('#CCCCCC');
                    doc.fillColor('#999999').fontSize(10).text(url ? 'Erro imagem' : 'Sem imagem', x, y + 150, { width: imgWidth, align: 'center' });
                }

                if (label) {
                    doc.fillColor(labelColor).fontSize(10).font('Helvetica-Bold').text(label, x, y - 15);
                }
            };

            // Left Image (Planta or Reference)
            if (plantaUrl) {
                await drawImage(plantaUrl, 60, imgY, 'PLANTA SALA', '#006400');
            } else if (refUrl) {
                await drawImage(refUrl, 60, imgY, 'PROJETO RA / MODELO', '#666666');
            } else {
                await drawImage(null, 60, imgY, 'Sem planta ou referência', '#999999');
            }

            // Right Image (Real photo)
            await drawImage(rightFotoUrl, 60 + imgWidth + 20, imgY, 'EXECUÇÃO REAL / OBRA', '#666666');

            // Bottom Labels
            doc.fillColor('#666666').fontSize(8).font('Helvetica-Bold');
            doc.text(plantaUrl ? '' : 'PROJETO RA / MODELO', 60, imgY + imgHeight + 5);
            doc.text('EXECUÇÃO REAL / OBRA', 60 + imgWidth + 20, imgY + imgHeight + 5);

            // ─── Footer Section ───
            if (hasLogo) {
                doc.image(logoPath, 680, 520, { width: 140 });
            }
        }
    }

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function generateAsBuiltReport(edificacao?: string): Promise<Buffer> {
    const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
        layout: 'landscape'
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    // Query rooms that are in 'VERIFICADA' or 'REVISAR' status for As-Built checking
    let query = database.select({
        apontamento: apontamentos,
        numeroSala: salas.numeroSala,
        salaNome: salas.nome,
        salaStatus: salas.status
    })
        .from(apontamentos)
        .innerJoin(salas, eq(apontamentos.sala, salas.nome));

    if (edificacao) {
        query = query.where(eq(apontamentos.edificacao, edificacao)) as any;
    }
    const data = await query;

    const logoPath = path.join(process.cwd(), 'client', 'public', 'logos_stecla', 'versão horizontal.png');
    const hasLogo = fs.existsSync(logoPath);

    if (data.length === 0) {
        doc.fontSize(20).text('Nenhum dado as-built encontrado.', 0, 200, { align: 'center' });
    } else {
        // Use for...of loop for async image fetching
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const index = i;

            if (index > 0) doc.addPage();

            // Background blue/gray accent for As-Built
            doc.rect(0, 0, 40, 595).fill('#1E3A8A');

            // Title
            doc.fillColor('#444444').fontSize(12).font('Helvetica').text('VERIFICAÇÃO AS BUILT', 60, 40);
            doc.fillColor('#000000').fontSize(24).font('Helvetica-Bold').text(`${item.numeroSala} - ${item.salaNome}`, 60, 55);

            // Page Number
            doc.fillColor('#444444').fontSize(24).font('Helvetica-Bold').text(String(index + 1).padStart(3, '0'), 750, 20);

            // ─── Layout: Side-by-Side ───
            const imgY = 110;
            const imgWidth = 340;
            const imgHeight = 350;

            // Helper to fetch/draw image
            const drawImage = async (url: string | null, x: number, y: number, height: number = imgHeight) => {
                let success = false;
                if (url) {
                    try {
                        if (url.startsWith('http')) {
                            const response = await axios.get(url, { responseType: 'arraybuffer' });
                            const buffer = Buffer.from(response.data);
                            doc.image(buffer, x, y, { width: imgWidth, height: height, fit: [imgWidth, height] });
                            success = true;
                        } else {
                            const fullPath = path.join(process.cwd(), url.replace(/^\//, ''));
                            if (fs.existsSync(fullPath)) {
                                doc.image(fullPath, x, y, { width: imgWidth, height: height, fit: [imgWidth, height] });
                                success = true;
                            }
                        }
                    } catch (e) {
                        console.error(`Error loading image ${url}:`, e);
                    }
                }

                if (!success) {
                    doc.rect(x, y, imgWidth, height).stroke('#CCCCCC');
                    doc.fillColor('#999999').fontSize(10).text(url ? 'Erro imagem' : 'Sem foto', x, y + 150, { width: imgWidth, align: 'center' });
                }
            };

            // FOTO REAL (Left) - Using fotoUrl
            await drawImage(item.apontamento.fotoUrl, 60, imgY);
            doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold').text('REALIDADE (OBRA)', 60, imgY - 15);

            // MODELO/PROJETO (Right) - Using fotoReferenciaUrl
            const rightX = 60 + imgWidth + 20;
            await drawImage(item.apontamento.fotoReferenciaUrl, rightX, imgY, 220);
            doc.fillColor('#666666').fontSize(10).font('Helvetica-Bold').text('MODELO AS-BUILT (INFORMAÇÃO)', rightX, imgY - 15);

            // ─── Legend ───
            const legendY = imgY + 230;
            doc.rect(rightX, legendY, 80, 20).fill('#FF0000');
            doc.fillColor('#FFFFFF').fontSize(8).text('PROJETO', rightX + 5, legendY + 6);

            doc.rect(rightX + 90, legendY, 80, 20).fill('#00FF00');
            doc.fillColor('#000000').fontSize(8).text('AS-BUILT', rightX + 95, legendY + 6);

            // ─── Properties/Info Box ───
            const propY = legendY + 30;
            doc.rect(rightX, propY, imgWidth, 90).stroke('#DDDDDD');
            doc.fillColor('#1E3A8A').fontSize(10).font('Helvetica-Bold').text('DADOS TÉCNICOS / APONTAMENTOS', rightX + 10, propY + 10);
            doc.fillColor('#000000').fontSize(9).font('Helvetica').text(item.apontamento.divergencia || '', rightX + 10, propY + 25, { width: imgWidth - 20 });

            // ─── Footer Section ───
            if (hasLogo) {
                doc.image(logoPath, 680, 520, { width: 140 });
            }
        }
    }

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function generateExcelReport(edificacao?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    // Fetch All Data
    let sQuery = database.select().from(salas);
    if (edificacao) {
        sQuery = sQuery.where(eq(salas.edificacao, edificacao)) as any;
    }
    const rawSalasData = await sQuery;

    // Numerical stable sort for Excel
    const salasData = [...rawSalasData].sort((a, b) => {
        const nA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
        const nB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
        return nA - nB;
    });

    let aQuery = database.select().from(apontamentos);
    if (edificacao) {
        aQuery = aQuery.where(eq(apontamentos.edificacao, edificacao)) as any;
    }
    const apontamentosData = await aQuery;

    // --- SHEET 1: Mapeamento Salas ---
    const sheetMapeamento = workbook.addWorksheet('Mapeamento Salas');
    sheetMapeamento.columns = [
        { header: 'Edificação', key: 'edificacao', width: 20 },
        { header: 'Pavimento', key: 'pavimento', width: 15 },
        { header: 'Setor', key: 'setor', width: 15 },
        { header: 'Sala', key: 'sala', width: 25 },
        { header: 'Número Sala', key: 'numeroSala', width: 12 },
        { header: 'Augin?', key: 'augin', width: 10 },
        { header: 'Tracker e QR Code?', key: 'trackerPosicionado', width: 18 },
        { header: 'QR Code Plastificado?', key: 'qrCodePlastificado', width: 18 },
        { header: 'statusRA', key: 'statusRA', width: 15 },
    ];

    salasData.forEach((item: any) => {
        sheetMapeamento.addRow({
            edificacao: item.edificacao,
            pavimento: item.pavimento,
            setor: item.setor,
            sala: item.nome,
            numeroSala: item.numeroSala,
            augin: item.augin ? 'Sim' : 'Não',
            trackerPosicionado: item.trackerPosicionado ? 'Sim' : 'Não',
            qrCodePlastificado: item.qrCodePlastificado ? 'Sim' : 'Não',
            statusRA: item.statusRA || 'PENDENTE'
        });
    });

    // --- SHEET 2: Apontamentos RA Obra ---
    const sheetApontamentos = workbook.addWorksheet('Apontamentos RA Obra');
    sheetApontamentos.columns = [
        { header: 'Data', key: 'data', width: 15 },
        { header: 'Número Apontamento', key: 'numeroApontamento', width: 20 },
        { header: 'Edificação', key: 'edificacao', width: 20 },
        { header: 'Pavimento', key: 'pavimento', width: 15 },
        { header: 'Setor', key: 'setor', width: 15 },
        { header: 'Sala', key: 'sala', width: 25 },
        { header: 'Disciplina', key: 'disciplina', width: 15 },
        { header: 'Divergência', key: 'divergencia', width: 50 },
    ];

    apontamentosData.forEach((item: any) => {
        sheetApontamentos.addRow({
            data: item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '',
            numeroApontamento: item.numeroApontamento,
            edificacao: item.edificacao,
            pavimento: item.pavimento,
            setor: item.setor,
            sala: item.sala,
            disciplina: item.disciplina,
            divergencia: item.divergencia
        });
    });

    // --- SHEET 3: Status da Verificação das Salas ---
    const sheetStatus = workbook.addWorksheet('Status Verificação Salas');
    sheetStatus.columns = [
        { header: 'Edificação', key: 'edificacao', width: 20 },
        { header: 'Pavimento', key: 'pavimento', width: 15 },
        { header: 'Setor', key: 'setor', width: 15 },
        { header: 'Sala', key: 'sala', width: 25 },
        { header: 'Número Sala', key: 'numeroSala', width: 12 },
        { header: 'Data Verificação', key: 'dataVerificada', width: 15 },
        { header: 'Faltou Disciplina?', key: 'faltouDisciplina', width: 15 },
        { header: 'Observações', key: 'obs', width: 40 },
        { header: 'Segunda Verificação Data', key: 'dataVerificacao2', width: 18 },
        { header: 'Observação 2', key: 'obs2', width: 40 },
        { header: 'Status da Sala', key: 'status', width: 15 },
    ];

    salasData.forEach((item: any) => {
        sheetStatus.addRow({
            edificacao: item.edificacao,
            pavimento: item.pavimento,
            setor: item.setor,
            sala: item.nome,
            numeroSala: item.numeroSala,
            dataVerificada: item.dataVerificada ? new Date(item.dataVerificada).toLocaleDateString('pt-BR') : '',
            faltouDisciplina: item.faltouDisciplina,
            obs: item.obs,
            dataVerificacao2: item.dataVerificacao2 ? new Date(item.dataVerificacao2).toLocaleDateString('pt-BR') : '',
            obs2: item.obs2,
            status: item.status || 'PENDENTE'
        });
    });

    [sheetMapeamento, sheetApontamentos, sheetStatus].forEach(sheet => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
