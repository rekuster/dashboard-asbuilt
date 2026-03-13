
import ExcelJS from "exceljs";
import fs from "fs";

async function analyze() {
    const files = [
        { name: "Mapeamento RA-As Built", path: "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento RA-As Built.xlsx" },
        { name: "As_Built_Status - Controle de Entregas - R07", path: "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\As_Built_Status - Controle de Entregas - R07.xlsx" }
    ];

    let summary = "# Spreadsheet Analysis Summary\n\n";

    for (const f of files) {
        summary += `\n## File: ${f.name}\n`;
        if (!fs.existsSync(f.path)) {
            summary += "❌ File not found!\n";
            continue;
        }

        const workbook = new ExcelJS.Workbook();
        try {
            await workbook.xlsx.readFile(f.path);
            workbook.eachSheet((sheet) => {
                summary += `### Sheet: ${sheet.name}\n`;
                const headers: string[] = [];
                const firstRow = sheet.getRow(1);
                firstRow.eachCell((cell) => {
                    headers.push(String(cell.value || ""));
                });
                summary += `**Headers**: ${headers.join(" | ")}\n\n`;

                summary += "| " + headers.join(" | ") + " |\n";
                summary += "| " + headers.map(() => "---").join(" | ") + " |\n";
                
                for (let i = 2; i <= 6; i++) {
                    const row = sheet.getRow(i);
                    const values: string[] = [];
                    for (let j = 1; j <= headers.length; j++) {
                        const cell = row.getCell(j);
                        values.push(String(cell.value || "").replace(/\n/g, " ").substring(0, 50));
                    }
                    summary += "| " + values.join(" | ") + " |\n";
                }
                summary += "\n---\n";
            });
        } catch (err: any) {
            summary += `❌ Error reading: ${err.message}\n`;
        }
    }

    fs.writeFileSync("spreadsheet_analysis.md", summary);
    console.log("Analysis saved to spreadsheet_analysis.md");
}

analyze();
