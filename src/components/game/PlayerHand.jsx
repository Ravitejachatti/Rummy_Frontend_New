import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCardImage } from "../utils/cardimages";
import { classifyGroup } from "../utils/rummyRules";

const SUIT_ORDER = { Spades: 0, Hearts: 1, Clubs: 2, Diamonds: 3, Joker: 4 };
const RANK_ORDER = { A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, JOKER: 99 };
const cardKey = (c) => c?.cardId || `${c?.rank}|${c?.suit}`;
const isJoker = (c) => c?.rank === "JOKER" || c?.suit === "Joker";

function primaryRankValue(card) {
  if (!card) return 99;
  if (card.rank === "A") return 1;
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;
  if (card.rank === "JOKER") return 99;
  return Number(card.rank) || 99;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a.suit] ?? 99) - (SUIT_ORDER[b.suit] ?? 99);
    if (suitDiff) return suitDiff;
    return (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99);
  });
}

function suitGlyph(suit) {
  const map = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠", Joker: "★" };
  return map[suit] || "";
}

function Card({ card, selected, onPointerDown, onPointerMove, onPointerUp, onNativeDragStart }) {
  const img = getCardImage(card);
  const red = card?.suit === "Hearts" || card?.suit === "Diamonds";
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => onNativeDragStart?.(event, card)}
      onPointerDown={(event) => onPointerDown?.(event, card)}
      onPointerMove={(event) => onPointerMove?.(event, card)}
      onPointerUp={(event) => onPointerUp?.(event, card)}
      onPointerCancel={(event) => onPointerUp?.(event, card)}
      className={`rummy-hand-card ${selected ? "selected" : ""}`}>
      {img ? (
        <img src={img} alt={`${card.rank} of ${card.suit}`} draggable={false} />
      ) : (
        <span className={`manual-card ${red ? "red" : "black"}`}>
          <span>{card.rank}</span>
          <strong>{suitGlyph(card.suit)}</strong>
        </span>
      )}
    </button>
  );
}


function makeCandidate(type, items, score) {
  return { type, items, keys: new Set(items.map(cardKey)), score };
}

function findPureSequenceCandidates(cards) {
  const bySuit = new Map();
  cards.filter((c) => !isJoker(c)).forEach((card) => {
    const suit = card.suit || "";
    if (!bySuit.has(suit)) bySuit.set(suit, []);
    bySuit.get(suit).push(card);
  });

  const candidates = [];
  bySuit.forEach((items) => {
    const byRank = new Map();
    items.forEach((card) => {
      const value = primaryRankValue(card);
      if (!byRank.has(value)) byRank.set(value, []);
      byRank.get(value).push(card);
      if (card.rank === "A") {
        if (!byRank.has(14)) byRank.set(14, []);
        byRank.get(14).push(card);
      }
    });

    const values = [...byRank.keys()].sort((a, b) => a - b);
    let run = [];

    const flushRun = () => {
      if (run.length < 3) return;
      const cardsInRun = run.map((value) => byRank.get(value)?.[0]).filter(Boolean);
      const unique = [];
      const seen = new Set();
      cardsInRun.forEach((card) => {
        const key = cardKey(card);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(card);
        }
      });
      if (unique.length >= 3) {
        candidates.push(makeCandidate("PURE_SEQUENCE", unique, 1000 + unique.length * 20));
        for (let i = 0; i <= unique.length - 3; i += 1) {
          const slice = unique.slice(i, i + 3);
          candidates.push(makeCandidate("PURE_SEQUENCE", slice, 900 + slice.length * 20));
        }
      }
    };

    for (let i = 0; i < values.length; i += 1) {
      if (!run.length || values[i] === run[run.length - 1] + 1) {
        run.push(values[i]);
      } else {
        flushRun();
        run = [values[i]];
      }
    }
    flushRun();
  });

  return candidates;
}

function findSetCandidates(cards) {
  const byRank = new Map();
  cards.filter((c) => !isJoker(c)).forEach((card) => {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card);
  });

  const candidates = [];
  byRank.forEach((items) => {
    const uniqueBySuit = [];
    const suits = new Set();
    sortCards(items).forEach((card) => {
      if (!suits.has(card.suit)) {
        suits.add(card.suit);
        uniqueBySuit.push(card);
      }
    });
    if (uniqueBySuit.length >= 3) {
      candidates.push(makeCandidate("SET", uniqueBySuit.slice(0, 4), 700 + uniqueBySuit.length * 10));
    }
  });
  return candidates;
}

function findImpureSequenceCandidates(cards) {
  const jokers = cards.filter(isJoker);
  if (!jokers.length) return [];

  const bySuit = new Map();
  cards.filter((c) => !isJoker(c)).forEach((card) => {
    const suit = card.suit || "";
    if (!bySuit.has(suit)) bySuit.set(suit, []);
    bySuit.get(suit).push(card);
  });

  const candidates = [];
  bySuit.forEach((items) => {
    const sorted = sortCards(items);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const left = primaryRankValue(sorted[i]);
        const right = primaryRankValue(sorted[j]);
        const gap = Math.max(0, right - left - 1);
        if (gap > 0 && gap <= jokers.length) {
          const needed = jokers.slice(0, gap);
          const candidate = [sorted[i], ...needed, sorted[j]];
          if (candidate.length >= 3) {
            candidates.push(makeCandidate("IMPURE_SEQUENCE", candidate, 650 + candidate.length * 10));
          }
        }
      }
    }
  });

  return candidates;
}

function autoArrangeCards(cards) {
  const sortedCards = sortCards(cards || []);
  const candidates = [
    ...findPureSequenceCandidates(sortedCards),
    ...findSetCandidates(sortedCards),
    ...findImpureSequenceCandidates(sortedCards),
  ].sort((a, b) => b.score - a.score);

  const used = new Set();
  const groups = [];

  candidates.forEach((candidate) => {
    const overlaps = [...candidate.keys].some((key) => used.has(key));
    if (overlaps) return;

    candidate.items.forEach((card) => used.add(cardKey(card)));
    groups.push({
      id: `auto-${candidate.type}-${groups.length}-${Date.now()}`,
      auto: true,
      type: candidate.type,
      items: sortCards(candidate.items),
    });
  });

  const ungrouped = sortedCards.filter((card) => !used.has(cardKey(card)));
  return { groups, ungrouped };
}

function groupLabel(cards, fallback, groupIndex = 0) {
  if (!cards || cards.length < 3) return fallback;
  const label = classifyGroup(cards);
  if (label === "Pure Sequence") return groupIndex === 0 ? "1st Life" : "2nd Life";
  if (label === "Impure Sequence") return groupIndex <= 1 ? "Life Needed" : "Impure Run";
  if (label === "Triplet") return "Set";
  return "Life Needed";
}

export default function PlayerHand({ cards = [], isMyTurn = false, canDiscard = false, onDiscard, onGroupsChange }) {
  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState(cards);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const dragStateRef = useRef(null);
  const [dragGhost, setDragGhost] = useState(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  useEffect(() => {
    const arranged = autoArrangeCards(cards);
    setUngrouped(arranged.ungrouped);
    setGroups(arranged.groups);
    setSelectedKeys(new Set());
  }, [cards]);

  useEffect(() => {
    onGroupsChange?.({ groups, ungrouped });
  }, [groups, ungrouped, onGroupsChange]);


  const toggleCard = (card) => {
    const key = cardKey(card);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const removeCardLocally = (card) => {
    const key = cardKey(card);
    setUngrouped((prev) => prev.filter((c) => cardKey(c) !== key));
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, items: (g.items || []).filter((c) => cardKey(c) !== key) }))
        .filter((g) => g.items.length)
    );
    setSelectedKeys(new Set());
  };

  const discardSpecificCard = (card) => {
    if (!card || !canDiscard) return;
    onDiscard?.(card);
    removeCardLocally(card);
  };

  const handleNativeDragStart = (event, card) => {
    if (!canDiscard || !card) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-rummy-card", JSON.stringify(card));
    event.dataTransfer.setData("text/plain", cardKey(card));
    window.__rummyDraggedCard = card;
    setSelectedKeys(new Set([cardKey(card)]));
  };

  const isPointInsideDiscardZone = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return Boolean(el?.closest?.(".rummy-discard-drop-zone"));
  };

  const handlePointerDown = (event, card) => {
    if (!card) return;
    dragStateRef.current = {
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const moved = Math.hypot(dx, dy) > 8;

    if (!moved && !drag.moved) return;

    drag.moved = true;
    const overDrop = isPointInsideDiscardZone(event.clientX, event.clientY);
    setIsOverDropZone(overDrop);
    setDragGhost({ card: drag.card, x: event.clientX, y: event.clientY });
    setSelectedKeys(new Set([cardKey(drag.card)]));
  };

  const handlePointerUp = (event) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const wasDrag = drag.moved;
    const shouldDiscard = wasDrag && isPointInsideDiscardZone(event.clientX, event.clientY);

    dragStateRef.current = null;
    setDragGhost(null);
    setIsOverDropZone(false);

    if (shouldDiscard) {
      discardSpecificCard(drag.card);
      return;
    }

    if (!wasDrag) {
      toggleCard(drag.card);
    }
  };

  const totalCards = ungrouped.length + groups.reduce((n, g) => n + (g.items?.length || 0), 0);

  // Always render both auto-detected groups AND the remaining cards.
  // Earlier versions hid ungrouped cards whenever at least one life/set was found,
  // which made most of the hand disappear after auto grouping.
  const displayGroups = [
    ...groups,
    ...(ungrouped.length
      ? [{ id: "ungrouped", items: ungrouped, virtual: true }]
      : []),
  ];

  return (
    <div className="rummy-hand-shell">
      <div className="rummy-score-box">Points : <strong>0</strong></div>

      <div className="rummy-hand-actions rummy-hand-actions-clean">
        <div className="hand-title">
          <strong>My Cards</strong>
          <span>{totalCards} cards • auto-arranged • drag a card to the open pile</span>
        </div>
        <div className="smart-hand-strip" aria-label="Smart grouping status">
          <span className="smart-chip">Auto Grouped</span>
          <span className={`drag-discard-coach ${canDiscard ? "active" : "disabled"}`}>Drag to Drop</span>
          {selectedKeys.size > 0 && (
            <button
              type="button"
              className="clear-selection-chip"
              onClick={() => setSelectedKeys(new Set())}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="rummy-groups-row">
        {displayGroups.map((group, groupIndex) => {
          const label = group.virtual ? "Ungrouped" : groupLabel(group.items, `${groupIndex + 1} Group`, groupIndex);
          const isGood = label === "1st Life" || label === "2nd Life" || label === "Impure Run" || label === "Set";
          return (
            <div key={group.id} className={`rummy-card-group ${group.virtual ? "ungrouped-free" : ""}`}>
              <button
                type="button"
                className="group-select"
              >
                {group.items.map((card) => (
                  <Card
                    key={cardKey(card)}
                    card={card}
                    selected={selectedKeys.has(cardKey(card))}
                    onNativeDragStart={handleNativeDragStart}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  />
                ))}
              </button>
              <div className={`rummy-group-label ${isGood ? "good" : "bad"}`}>{label}</div>
            </div>
          );
        })}
      </div>

      {dragGhost && (
        <div
          className={`rummy-drag-ghost ${isOverDropZone ? "over-drop" : ""}`}
          style={{ left: dragGhost.x, top: dragGhost.y }}
          aria-hidden="true"
        >
          <Card card={dragGhost.card} selected={false} />
        </div>
      )}
    </div>
  );
}
