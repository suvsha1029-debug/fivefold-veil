import { env } from 'cloudflare:workers';
import { D1RoomStore } from '../../../../server/rooms.js';
import { TwitchSessionApi } from '../../../../server/twitch-session.js';
export const dynamic = 'force-dynamic';
const serve = (request: Request) => new TwitchSessionApi(new D1RoomStore(env.DB), { env }).fetch(request);
export const GET = serve;
export const POST = serve;
