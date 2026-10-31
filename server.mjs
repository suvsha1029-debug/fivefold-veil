import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { RoomApi } from './server/rooms.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const dataDir = new URL('./.openai/local/rehearsal/', import.meta.url);
await mkdir(dataDir, { recursive: true });
const db = new DatabaseSync(fileURLToPath(new URL('rooms.sqlite', dataDir)));
db.exec('CREATE TABLE IF NOT EXISTS room_documents (code TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
db.exec('CREATE INDEX IF NOT EXISTS room_expiry ON room_documents(expires_at)');
const findRoom = db.prepare('SELECT data, version FROM room_documents WHERE code=?');
const createRoom = db.prepare('INSERT OR IGNORE INTO room_documents VALUES (?, ?, 0, ?)');
const updateRoom = db.prepare('UPDATE room_documents SET data=?, version=version+1, expires_at=? WHERE code=? AND version=?');
const deleteExpired = db.prepare('DELETE FROM room_documents WHERE expires_at < ?');
const roomApi = new RoomApi({
  get(code) {
    const row = findRoom.get(code);
    return row ? {data: JSON.parse(row.data), version: row.version} : null;
  },
  insert(code, room) {
    return createRoom.run(code, JSON.stringify(room), room.expiresAt).changes === 1;
  },
  save(code, room, version) {
    return updateRoom.run(JSON.stringify(room), room.expiresAt, code, version).changes === 1;
  },
  cleanup(now) { deleteExpired.run(now); },
});
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };

createServer(async (req, res) => {
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
  if(req.url.startsWith('/api/rooms')){
    const limit=/^\/api\/rooms\/[^/]+\/council$/.test(req.url)?70000:4096;
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit){res.writeHead(413,headers).end('Request too large');return;}chunks.push(chunk);}
    const response=await roomApi.fetch(new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { ...headers, Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : ['/teams','/teams/'].includes(pathname)?'/teams.html':pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) {
      res.writeHead(403, headers).end('Forbidden');
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, { ...headers, 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, headers).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Fivefold Veil ready. Local: http://localhost:${port}/`);
  console.log('Local rehearsal rooms persist for 24 hours, including across server restarts.');
});
