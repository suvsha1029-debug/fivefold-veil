import { env } from 'cloudflare:workers';
import { RoomApi, D1RoomStore } from '../../../../server/rooms.js';
export const dynamic='force-dynamic';
const serve=(request:Request)=>new RoomApi(new D1RoomStore(env.DB)).fetch(request);
export const GET=serve;
export const POST=serve;
