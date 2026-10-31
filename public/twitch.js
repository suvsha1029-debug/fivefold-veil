const AUTH_KEY = 'signal-lab-oauth-state';
const CLIENT_KEY = 'signal-lab-client-id';
const WS_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';

export function callbackUrl() {
  return location.origin + location.pathname;
}

export function savedClientId() {
  return sessionStorage.getItem(CLIENT_KEY) || '';
}

export function beginTwitchLogin(clientId) {
  const clean = clientId.trim();
  if (!/^[a-zA-Z0-9]{10,64}$/.test(clean)) throw new Error('Enter the Client ID from your Twitch application. This is not a client secret.');
  const state = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({ state, createdAt: Date.now() }));
  sessionStorage.setItem(CLIENT_KEY, clean);
  const params = new URLSearchParams({ client_id: clean, redirect_uri: callbackUrl(), response_type: 'token', scope: 'user:read:chat', state, force_verify: 'true' });
  location.assign('https://id.twitch.tv/oauth2/authorize?' + params);
}

// Consume the OAuth fragment immediately. The access token stays in memory only.
export function consumeTwitchLogin() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (!params.has('access_token') && !params.has('error')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  let pending;
  try { pending = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); } catch { pending = null; }
  sessionStorage.removeItem(AUTH_KEY);
  if (!pending || pending.state !== params.get('state') || Date.now() - pending.createdAt > 600000 || pending.createdAt > Date.now()) {
    throw new Error('The Twitch sign-in request expired or could not be verified. Please connect again.');
  }
  if (params.has('error')) throw new Error('Twitch sign-in was cancelled. You can reconnect whenever you are ready.');
  return { token: params.get('access_token'), clientId: savedClientId() };
}

export class TwitchChat {
  #token = null;
  #clientId = null;
  #user = null;
  #socket = null;
  #sockets = new Set();
  #stopped = true;
  #seen = new Set();
  #retryTimer = null;
  #validationTimer = null;
  #watchdog = null;
  #lastMessage = 0;
  #keepalive = 30;
  #retries = 0;
  #generation = 0;

  constructor({ onStatus, onMessage, onModeration = null, fetchImpl = globalThis.fetch.bind(globalThis), WebSocketImpl = globalThis.WebSocket }) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.onModeration = onModeration;
    this.fetch = fetchImpl;
    this.Socket = WebSocketImpl;
  }

  async connect(token, clientId) {
    this.disconnect(false);
    const generation = this.#generation;
    this.#token = token;
    this.#clientId = clientId;
    this.#stopped = false;
    this.onStatus({ state: 'connecting', message: 'Verifying Twitch sign-in…' });
    try {
      const identity = await this.#validate();
      if (generation !== this.#generation) return;
      this.#user = identity;
      this.#open(WS_URL, false);
      this.#validationTimer = setInterval(() => this.#validate().catch(() => { if (generation === this.#generation) this.#fail('Twitch sign-in needs to be renewed. Connect again.'); }), 60 * 60 * 1000);
      this.#watchdog = setInterval(() => {
        if (this.#socket && Date.now() - this.#lastMessage > (this.#keepalive + 10) * 1000) this.#socket.close();
      }, 5000);
    } catch (error) {
      if (generation === this.#generation) this.#fail(error.message);
    }
  }

  async #validate() {
    const res = await this.fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + this.#token } });
    if (!res.ok) throw new Error('Twitch sign-in expired. Please connect again.');
    const user = await res.json();
    if (user.client_id !== this.#clientId || !user.user_id || !user.scopes?.includes('user:read:chat')) throw new Error('Twitch did not grant the expected chat permission. Please reconnect with your broadcaster account.');
    return user;
  }

  #open(url, transferred) {
    if (this.#stopped) return;
    const generation = this.#generation;
    let socket;
    try { socket = new this.Socket(url); } catch { this.#retry(); return; }
    this.#sockets.add(socket);
    socket.onmessage = async event => {
      if (this.#stopped || generation !== this.#generation) return;
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      this.#lastMessage = Date.now();
      const type = data.metadata?.message_type;
      if (type === 'session_welcome') {
        const session = data.payload?.session;
        if (!session?.id) { socket.close(); return; }
        const old = this.#socket;
        this.#socket = socket;
        this.#keepalive = session.keepalive_timeout_seconds || 30;
        try {
          if (!transferred) await this.#subscribe(session.id);
          if (this.#stopped || generation !== this.#generation) return;
          this.#retries = 0;
          this.onStatus({ state: 'connected', channel: this.#user.login, message: `Connected to @${this.#user.login}` });
          if (old && old !== socket) old.close();
        } catch (error) { this.#fail(error.message); }
      } else if (type === 'session_reconnect') {
        try {
          const reconnect = new URL(data.payload.session.reconnect_url);
          if (reconnect.protocol !== 'wss:' || reconnect.hostname !== 'eventsub.wss.twitch.tv') throw new Error();
          this.onStatus({ state: 'reconnecting', message: 'Twitch is moving this connection. The case is paused.' });
          this.#open(reconnect.href, true);
        } catch { this.#fail('Twitch returned an unexpected reconnect address. Please connect again.'); }
      } else if (type === 'revocation') {
        this.#fail('Twitch chat permission was revoked. Connect again to resume.');
      } else if (type === 'notification' && data.payload?.subscription?.type === 'channel.chat.message') {
        const chat = data.payload.event;
        if (!chat || chat.broadcaster_user_id !== this.#user?.user_id || typeof chat.message?.text !== 'string' || !chat.chatter_user_id) return;
        const id = chat.message_id || data.metadata.message_id;
        if (!id || this.#seen.has(id)) return;
        this.#seen.add(id);
        if (this.#seen.size > 500) this.#seen.delete(this.#seen.values().next().value);
        this.onMessage({ text: chat.message.text, id: chat.chatter_user_id, name: chat.chatter_user_name || 'Researcher', messageId:id, sentAt:Date.parse(data.metadata.message_timestamp)||Date.now() });
      } else if(type==='notification'&&this.onModeration){
        const kinds={'channel.chat.message_delete':'delete','channel.chat.clear_user_messages':'user','channel.chat.clear':'clear'},kind=kinds[data.payload?.subscription?.type],event=data.payload?.event;
        if(kind&&event?.broadcaster_user_id===this.#user?.user_id)this.onModeration({type:kind,messageId:event.message_id,userId:event.target_user_id,at:Date.parse(data.metadata.message_timestamp)||Date.now()});
      }
    };
    socket.onclose = () => {
      this.#sockets.delete(socket);
      if (this.#stopped || generation !== this.#generation) return;
      if (socket === this.#socket) {
        this.#socket = null;
        this.#retry();
      } else if (!this.#socket) this.#retry();
    };
    socket.onerror = () => {
      if (this.#stopped || generation !== this.#generation) return;
      this.onStatus({ state: 'reconnecting', message: 'Twitch connection interrupted. The case is paused.' });
      socket.close();
    };
  }

  async #subscribe(sessionId) {
    const types=['channel.chat.message',...(this.onModeration?['channel.chat.message_delete','channel.chat.clear_user_messages','channel.chat.clear']:[])];
    for(const type of types){
    const res = await this.fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.#token, 'Client-Id': this.#clientId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, version: '1', condition: { broadcaster_user_id: this.#user.user_id, user_id: this.#user.user_id }, transport: { method: 'websocket', session_id: sessionId } }),
    });
    if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'Twitch could not authorize chat access. Reconnect with the account that owns the channel.' : 'Twitch could not start the chat subscription. Please reconnect.');
    }
  }

  #retry() {
    if (this.#stopped || this.#retryTimer) return;
    this.onStatus({ state: 'reconnecting', message: 'Reconnecting to Twitch. The case is paused.' });
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      this.#open(WS_URL, false);
    }, Math.min(30000, 1000 * 2 ** Math.min(this.#retries++, 5)));
  }

  #fail(message) {
    this.disconnect(false);
    this.onStatus({ state: 'error', message });
  }

  disconnect(notify = true) {
    this.#stopped = true;
    this.#generation += 1;
    clearTimeout(this.#retryTimer);
    clearInterval(this.#validationTimer);
    clearInterval(this.#watchdog);
    this.#retryTimer = null;
    for (const socket of this.#sockets) socket.close();
    this.#sockets.clear();
    this.#socket = null;
    this.#token = null;
    this.#user = null;
    this.#seen.clear();
    if (notify) this.onStatus({ state: 'disconnected', message: 'Twitch disconnected. Practice mode is available.' });
  }
}
