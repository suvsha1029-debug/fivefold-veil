// Only public identity and connection status cross this boundary. OAuth tokens
// remain in the server vault; the browser sends its HttpOnly cookie itself.
export class TwitchSessionClient {
  constructor(fetchImpl = globalThis.fetch.bind(globalThis)) { this.fetch = fetchImpl; }
  async response(action, body) {
    if (!['status','start','exchange','validate','channel','subscribe','disconnect'].includes(action)) throw new Error('Unknown Twitch connection action.');
    try {
      return await this.fetch('/api/twitch/' + action, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
        cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(25000),
        ...(body === undefined ? {} : { headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }),
      });
    } catch { throw new Error('Could not reach Twitch connection settings. Retry when your connection is ready.'); }
  }
  async request(action, body) {
    const response = await this.response(action, body);
    let data; try { data = await response.json(); } catch { throw new Error('Twitch connection settings are unavailable. Please retry.'); }
    if (!response.ok) throw Object.assign(new Error(data.error || 'Twitch connection could not be restored.'), {status:response.status,code:data.code});
    return data;
  }
  async start() {
    const data = await this.request('start', {});
    const url = new URL(data.authorizationUrl);
    if (url.origin !== 'https://id.twitch.tv' || url.pathname !== '/oauth2/authorize' || url.searchParams.get('response_type') !== 'code') throw new Error('The sign-in address could not be verified. Please retry.');
    return url.href;
  }
}

export function consumeTwitchCode(locationImpl = location, historyImpl = history) {
  const url = new URL(locationImpl.href);
  const legacy = new URLSearchParams(url.hash.slice(1));
  if (!url.searchParams.has('code') && !url.searchParams.has('error') && !legacy.has('access_token')) return null;
  const result = {code:url.searchParams.get('code'),state:url.searchParams.get('state')};
  for (const key of ['code','state','error','error_description','scope']) url.searchParams.delete(key);
  if (legacy.has('access_token')) url.hash = '';
  historyImpl.replaceState(null, '', url.pathname + url.search + url.hash);
  if (!result.code) throw new Error('Twitch sign-in was cancelled or used an older connection link. Connect again when ready.');
  return result;
}
