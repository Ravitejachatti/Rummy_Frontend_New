// Production-safe client action IDs for idempotent Socket.IO actions.
// Backend patch 14 requires clientActionId for gameplay mutations.
export function createClientActionId(action = 'action') {
  const safeAction = String(action || 'action').replace(/[^a-zA-Z0-9:_-]/g, '_');
  const timestamp = Date.now();
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${safeAction}:${timestamp}:${random}`;
}
