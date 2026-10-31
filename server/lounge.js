import { DOMAINS, validDomain } from '../public/domains.js';

const MESSAGE_LIMIT = 24;
const SEND_INTERVAL_MS = 1500;
const fail = (message, status = 400) => Object.assign(new Error(message), {status});
const result = (message, extra = {}) => ({kind: 'lounge', message, ...extra});

function createLounge() {
  return {
    enabled: true,
    channels: Object.fromEntries(DOMAINS.map(domain => [domain.id, []])),
    lastSent: {},
  };
}

/** Lounge messages are public to everyone who can visit this expedition. */
export function loungeState(room) {
  return {
    enabled: room.lounge?.enabled ?? true,
    channels: Object.fromEntries(DOMAINS.map(domain => [
      domain.id,
      (room.lounge?.channels?.[domain.id] || []).slice(-MESSAGE_LIMIT).map(message => ({
        id: message.id,
        memberId: message.memberId,
        name: message.name,
        avatar: message.avatar,
        team: message.team,
        text: message.text,
        at: message.at,
      })),
    ])),
  };
}

export function loungeAction(room, auth, body, now) {
  if (!auth.host && !auth.member) throw fail('Join a viewer seat to use lounge chat.', 401);
  const lounge = room.lounge ||= createLounge();

  if (body.type === 'enable') {
    if (!auth.host) throw fail('Only the host can open or pause lounge chat.', 403);
    if (typeof body.enabled !== 'boolean') throw fail('Choose whether lounge chat is open.');
    lounge.enabled = body.enabled;
    return result(body.enabled ? 'Lounge chat is open.' : 'The host paused lounge chat.');
  }

  if (!validDomain(body.domain)) throw fail('Choose one of the six domains.');
  const messages = lounge.channels[body.domain] ||= [];
  const memberId = auth.host ? 'host' : auth.member.id;

  if (body.type === 'send') {
    if (!lounge.enabled) throw fail('The host paused lounge chat.', 409);
    if (typeof body.text !== 'string') throw fail('Write a lounge message.');
    const text = body.text.replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
    if (!text || text.length > 240) throw fail('Use between 1 and 240 characters.');
    if (now - (lounge.lastSent[memberId] ?? -Infinity) < SEND_INTERVAL_MS) {
      throw fail('Wait a moment before sending another lounge message.', 429);
    }

    const id = crypto.randomUUID();
    messages.push({
      id,
      memberId,
      name: auth.host ? 'Host' : auth.member.name,
      avatar: auth.host ? '✧' : auth.member.avatar,
      team: auth.host ? null : auth.member.team,
      text,
      at: now,
    });
    lounge.channels[body.domain] = messages.slice(-MESSAGE_LIMIT);
    lounge.lastSent[memberId] = now;
    return result('Message shared with this domain.', {id});
  }

  if (body.type === 'remove') {
    const message = messages.find(entry => entry.id === body.id);
    if (!message) throw fail('That lounge message has already gone.', 404);
    if (!auth.host && message.memberId !== memberId) {
      throw fail('Only the author or host can remove this message.', 403);
    }
    lounge.channels[body.domain] = messages.filter(entry => entry.id !== body.id);
    return result('Lounge message removed.');
  }

  if (body.type === 'clear') {
    if (!auth.host) throw fail('Only the host can clear a domain conversation.', 403);
    lounge.channels[body.domain] = [];
    return result('Domain conversation cleared.');
  }

  throw fail('Choose a lounge action.');
}
