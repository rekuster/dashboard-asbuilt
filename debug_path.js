import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('__dirname:', __dirname);
console.log('Resolved path:', path.resolve(__dirname, '..', 'Tema Layout interface Stecla'));
