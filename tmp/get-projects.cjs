const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function getProject() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT id, name FROM projects LIMIT 5`;
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getProject();
