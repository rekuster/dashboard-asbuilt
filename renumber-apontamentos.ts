import "dotenv/config";
import postgres from "postgres";

async function renumber() {
    const client = postgres(process.env.DATABASE_URL!, {
        ssl: { rejectUnauthorized: false },
        max: 1,
        prepare: false,
    });

    console.log("Fetching all apontamentos ordered by date...");
    const rows = await client`
        SELECT id, "numeroApontamento", data, sala
        FROM apontamentos
        ORDER BY data ASC, id ASC
    `;

    console.log(`Found ${rows.length} apontamentos. Current numbering:`);
    rows.forEach((r, i) => {
        console.log(`  id=${r.id}  current=#${r.numeroApontamento}  new=#${i + 1}  sala=${r.sala}`);
    });

    console.log("\nRenumbering...");
    for (let i = 0; i < rows.length; i++) {
        const newNum = i + 1;
        await client`
            UPDATE apontamentos
            SET "numeroApontamento" = ${newNum}
            WHERE id = ${rows[i].id}
        `;
    }

    console.log(`✅ Done! Renumbered ${rows.length} apontamentos (1 to ${rows.length}).`);
    await client.end();
}

renumber().catch(console.error);
