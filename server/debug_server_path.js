import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root from server location
const rootFromServer = path.resolve(__dirname, '..');
const folderPath = path.join(rootFromServer, 'Tema Layout interface Stecla');

console.log('--- Debugging Paths ---');
console.log('Project Root:', rootFromServer);
console.log('Folder path:', folderPath);
console.log('Folder exists:', fs.existsSync(folderPath));

if (fs.existsSync(folderPath)) {
    console.log('Contents:', fs.readdirSync(folderPath));
    const capa = path.join(folderPath, 'Layout Capa.png');
    console.log('Capa full path:', capa);
    console.log('Capa exists:', fs.existsSync(capa));
}

// Current Working Directory Root
console.log('CWD:', process.cwd());
const folderPathCWD = path.join(process.cwd(), 'Tema Layout interface Stecla');
console.log('Folder path from CWD:', folderPathCWD);
console.log('Folder exists from CWD:', fs.existsSync(folderPathCWD));
