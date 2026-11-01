// Clock updates have their own lightweight path. Keep unchanged polls from
// replacing controls while someone is choosing a theory or reading evidence.
export function roomContentKey(state) {
  const { serverNow, game, ...room } = state;
  const { remainingMs, ...content } = game;
  return JSON.stringify([room, content]);
}
