// Client-side duplicate click guard for gameplay actions. Server remains authoritative.
const locks = new Map();

export function isActionLocked(key) {
  const until = locks.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    locks.delete(key);
    return false;
  }
  return true;
}

export function lockAction(key, ttlMs = 2500) {
  if (!key) return false;
  if (isActionLocked(key)) return false;
  locks.set(key, Date.now() + ttlMs);
  return true;
}

export function unlockAction(key) {
  if (key) locks.delete(key);
}
