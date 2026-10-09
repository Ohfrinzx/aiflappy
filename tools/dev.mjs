// `npm run dev`: serves the game at http://localhost:8080 (next free port if taken).
//   npm run dev -- --port 3000
import { startDevServer } from './serve.mjs';

const i = process.argv.indexOf('--port');
await startDevServer(Number(i > -1 ? process.argv[i + 1] : process.env.PORT) || 8080);
