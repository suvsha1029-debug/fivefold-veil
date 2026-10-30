import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { RoomApi, MemoryRoomStore } from './server/rooms.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const roomApi = new RoomApi(new MemoryRoomStore());
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
  if(req.url.startsWith('/api/rooms')){
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413,headers).end('Request too large');return;}chunks.push(chunk);}
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
  console.log('Lightweight rehearsal server: rooms are in memory and reset on restart. Use npm start for the built D1-backed preview.');
});
