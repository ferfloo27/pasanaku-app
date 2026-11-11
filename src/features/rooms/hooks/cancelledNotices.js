const seenInMemory = new Set();
const noticeKey = (userId, roomId) => `pasanaku:cancelled-notice:${userId}:${roomId}`;

export function hasSeenCancellation(userId, roomId) {
  const key = noticeKey(userId, roomId);
  let seen = seenInMemory.has(key);
  try { seen ||= localStorage.getItem(key) === 'seen'; } catch { /* Memoria si se bloqueó el almacenamiento. */ }
  return seen;
}

export function markCancellationSeen(userId, roomId) {
  const key = noticeKey(userId, roomId);
  seenInMemory.add(key);
  try { localStorage.setItem(key, 'seen'); } catch { /* El aviso sigue siendo cerrable. */ }
}
