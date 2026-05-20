import socketService from "../config/socket";
import { createClientActionId } from "../utils/clientActionId";
import { lockAction } from "../utils/actionLock";

function getStableJoinActionId(tableId) {
  if (typeof window === "undefined") return createClientActionId("join_table");
  const key = `rummy_join_action_id:${tableId}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = createClientActionId("join_table");
    sessionStorage.setItem(key, id);
  }
  return id;
}

function emitWithAction(event, actionName, payload = {}, options = {}) {
  const clientActionId = createClientActionId(actionName || event);
  const lockKey = options.lockKey || `${event}:${payload.gameId || payload.tableId || "global"}`;
  if (options.lock !== false && !lockAction(lockKey, options.ttlMs || 2500)) {
    return null;
  }
  socketService.emit(event, {
    ...payload,
    clientActionId,
  });
  return clientActionId;
}

export function emitJoinTable({ tableId, deviceId, hardwareId }) {
  if (!tableId) return;
  socketService.emit("rummy/join_table", {
    tableId,
    deviceId,
    hardwareId,
    clientActionId: getStableJoinActionId(tableId),
  });
}

export function emitDrawCard({ gameId, source, stateVersion = 0 }) {
  if (!gameId || !source) return;
  const normalizedSource = String(source).toLowerCase() === "discard" ? "discard" : "draw";
  return emitWithAction("rummy/draw_card", "draw_card", { gameId, source: normalizedSource, stateVersion }, { lockKey: `draw:${gameId}`, ttlMs: 2500 });
}

export function emitDiscardCard({ gameId, card, stateVersion = 0 }) {
  if (!gameId || !card) return;
  return emitWithAction("rummy/discard_card", "discard_card", { gameId, card, stateVersion }, { lockKey: `discard:${gameId}:${card.cardId || "card"}`, ttlMs: 2500 });
}

export function emitDropGame({ gameId, stateVersion = 0 }) {
  if (!gameId) return;
  return emitWithAction("rummy/drop", "drop", { gameId, stateVersion }, { lockKey: `drop:${gameId}`, ttlMs: 4000 });
}

export function emitDeclareWin({ gameId, playerId, groups, ungrouped, forceWin, stateVersion = 0 }) {
  if (!gameId) return;
  const clientActionId = createClientActionId("declare_win");
  if (!lockAction(`declare:${gameId}`, 5000)) return null;
  socketService.emit("rummy/declare_win", {
    gameId,
    playerId,
    groups: Array.isArray(groups) ? groups : [],
    ungrouped: Array.isArray(ungrouped) ? ungrouped : [],
    forceWin: Boolean(forceWin),
    stateVersion,
    clientActionId,
  });
  return clientActionId;
}

export function emitShowConfirm({ gameId, decision, stateVersion = 0 }) {
  if (!gameId || !decision) return;
  return emitWithAction("rummy/show_confirm", "show_confirm", { gameId, decision, stateVersion }, { lockKey: `show_confirm:${gameId}:${decision}`, ttlMs: 2500 });
}

export function emitLeaveTable({ tableId }) {
  if (!tableId) return;
  socketService.emit("rummy/leave_table", {
    tableId,
    clientActionId: createClientActionId("leave_table"),
  });
}
