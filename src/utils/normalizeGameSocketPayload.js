export const GAME_PHASE = Object.freeze({
  LOBBY: "LOBBY",
  DEALING: "DEALING",
  PLAYING: "PLAYING",
  SHOW_CONFIRM: "SHOW_CONFIRM",
  SCORING: "SCORING",
  SETTLEMENT_PENDING: "SETTLEMENT_PENDING",
  BETWEEN_GAMES: "BETWEEN_GAMES",
  JOIN_WINDOW_OPEN: "JOIN_WINDOW_OPEN",
  ENDED: "ENDED",
});

function ensureCardId(card, index, prefix = "client-gen") {
  if (card && typeof card === "object" && !card.cardId) {
    return {
      ...card,
      cardId: `${prefix}-${card.suit || "unknown"}-${card.rank || "unknown"}-${index}`,
    };
  }
  return card;
}

export function normalizeDiscardHistory(payload = {}) {
  if (Array.isArray(payload.discardHistory)) return payload.discardHistory;
  if (Array.isArray(payload.drawPileTop)) return payload.drawPileTop;
  if (payload.discardTop) return [payload.discardTop];
  if (payload.card) return [payload.card];
  return [];
}

export function normalizeGameStatePayload(payload = {}) {
  const source = payload?.activeGame && typeof payload.activeGame === "object" ? payload.activeGame : payload;
  
  const rawDiscardHistory = normalizeDiscardHistory(source);
  const discardHistory = Array.isArray(rawDiscardHistory)
    ? rawDiscardHistory.map((c, idx) => ensureCardId(c, idx, "discardHistory"))
    : [];

  const phase = source.phase || source.gamePhase || null;
  const status = source.status || (phase === GAME_PHASE.PLAYING ? "PLAYING" : "waiting");
  const numericStateVersion = Number(source.stateVersion ?? payload.stateVersion ?? 0);
  
  const rawMyHand = Array.isArray(source.myHand)
    ? source.myHand
    : Array.isArray(source.hand)
      ? source.hand
      : Array.isArray(payload.myHand)
        ? payload.myHand
        : Array.isArray(payload.hand)
          ? payload.hand
          : undefined;

  const myHand = Array.isArray(rawMyHand)
    ? rawMyHand.map((c, idx) => ensureCardId(c, idx, "myHand"))
    : undefined;

  const discardTop = source.discardTop
    ? ensureCardId(source.discardTop, 0, "discardTop")
    : (discardHistory.length ? discardHistory[discardHistory.length - 1] : null);

  const players = (Array.isArray(source.players) ? source.players : []).map(player => {
    if (player && Array.isArray(player.hand)) {
      return {
        ...player,
        hand: player.hand.map((c, idx) => ensureCardId(c, idx, `player-${player.id || player.playerId || "unknown"}`)),
      };
    }
    return player;
  });

  const declaration = source.declaration 
    ? {
        ...source.declaration,
        groups: Array.isArray(source.declaration.groups)
          ? source.declaration.groups.map((group, gIdx) =>
              Array.isArray(group)
                ? group.map((c, idx) => ensureCardId(c, `${gIdx}-${idx}`, "decl-group"))
                : group
            )
          : [],
        ungrouped: Array.isArray(source.declaration.ungrouped)
          ? source.declaration.ungrouped.map((c, idx) => ensureCardId(c, idx, "decl-ungrouped"))
          : []
      }
    : null;

  return {
    ...source,
    gameId: source.gameId || source.activeGameId || payload.gameId || null,
    tableId: source.tableId || payload.tableId || null,
    status,
    gamePhase: source.gamePhase || phase,
    phase,
    currentTurn: source.currentTurn ?? null,
    stateVersion: Number.isFinite(numericStateVersion) ? numericStateVersion : 0,
    allowedActions: Array.isArray(source.allowedActions) ? source.allowedActions : [],
    settlementStatus: source.settlementStatus || source.lifecyclePhase || payload.settlementStatus || null,
    lastActionId: source.clientActionId || source.lastActionId || payload.clientActionId || payload.lastActionId || null,
    myHand,
    discardTop,
    discardHistory,
    drawPileCount: Number.isFinite(source.drawPileCount) ? source.drawPileCount : 0,
    players,
    declaration,
  };
}
