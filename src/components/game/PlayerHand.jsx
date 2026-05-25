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


function groupLabel(cards, fallback, groupIndex = 0) {
  if (!cards || cards.length < 3) return fallback;
  const label = classifyGroup(cards);
  if (label === "Pure Sequence") return groupIndex === 0 ? "1st Life" : "2nd Life";
  if (label === "Impure Sequence") return groupIndex <= 1 ? "Life Needed" : "Impure Run";
  if (label === "Triplet") return "Set";
  return "Life Needed";
}

function Card({
  card,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onNativeDragStart,
  onDragOver,
  onDrop,
  isHidden
}) {
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
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rummy-hand-card ${selected ? "selected" : ""} ${isHidden ? "rummy-hand-card-hidden" : ""}`}>
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

export default function PlayerHand({
  cards = [],
  isMyTurn = false,
  canDiscard = false,
  onDiscard,
  onGroupsChange,
  onReorder,
  animatingCardId
}) {
  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState(cards);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const dragStateRef = useRef(null);
  const [dragGhost, setDragGhost] = useState(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  // Synchronize local groups and ungrouped cards state with the incoming cards prop (e.g. from server)
  // this keeps manual grouping intact while handling drawn cards and discarded cards properly.
  useEffect(() => {
    const currentKeys = new Set(cards.map(c => cardKey(c)));
    const localKeys = new Set([
      ...ungrouped.map(c => cardKey(c)),
      ...groups.flatMap(g => g.items.map(c => cardKey(c)))
    ]);

    // If they have the same size and all keys match, we don't need to rebuild groups/ungrouped state
    if (currentKeys.size === localKeys.size && [...currentKeys].every(k => localKeys.has(k))) {
      return;
    }

    if (groups.length === 0 && ungrouped.length === 0) {
      setUngrouped(cards);
      return;
    }

    // Clean up removed cards from groups
    const nextGroups = groups
      .map(g => ({
        ...g,
        items: g.items.filter(c => currentKeys.has(cardKey(c)))
      }))
      .filter(g => g.items.length > 0);

    // Clean up removed cards from ungrouped
    const nextUngrouped = ungrouped.filter(c => currentKeys.has(cardKey(c)));

    // Find cards that are new (e.g. drawn from deck/discard)
    const existingKeys = new Set([
      ...nextUngrouped.map(c => cardKey(c)),
      ...nextGroups.flatMap(g => g.items.map(c => cardKey(c)))
    ]);
    const addedCards = cards.filter(c => !existingKeys.has(cardKey(c)));

    // Append new cards to ungrouped list
    const finalUngrouped = [...nextUngrouped, ...addedCards];

    setGroups(nextGroups);
    setUngrouped(finalUngrouped);
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
    const newUngrouped = ungrouped.filter((c) => cardKey(c) !== key);
    const newGroups = groups
      .map((g) => ({ ...g, items: (g.items || []).filter((c) => cardKey(c) !== key) }))
      .filter((g) => g.items.length);

    setUngrouped(newUngrouped);
    setGroups(newGroups);
    setSelectedKeys(new Set());
  };

  const discardSpecificCard = (card) => {
    if (!card || !canDiscard) return;
    onDiscard?.(card);
    removeCardLocally(card);
  };

  const handleNativeDragStart = (event, card, sourceGroupId) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-rummy-card", JSON.stringify(card));
    event.dataTransfer.setData("application/x-rummy-card-id", cardKey(card));
    event.dataTransfer.setData("application/x-rummy-source-group", sourceGroupId);
    window.__rummyDraggedCard = card;
    window.__rummyDraggedCardSourceGroup = sourceGroupId;
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

  // Card movement drag and drop logic
  const moveCard = (draggedCardId, sourceGroupId, targetGroupId, targetCardIndex) => {
    let cardToMove = null;

    // 1. Remove card from source group
    let newUngrouped = [...ungrouped];
    let newGroups = groups.map(g => {
      if (g.id === sourceGroupId) {
        const idx = g.items.findIndex(c => cardKey(c) === draggedCardId);
        if (idx !== -1) {
          cardToMove = g.items[idx];
          const newItems = [...g.items];
          newItems.splice(idx, 1);
          return { ...g, items: newItems };
        }
      }
      return g;
    });

    if (sourceGroupId === "ungrouped") {
      const idx = newUngrouped.findIndex(c => cardKey(c) === draggedCardId);
      if (idx !== -1) {
        cardToMove = newUngrouped[idx];
        newUngrouped.splice(idx, 1);
      }
    }

    // Fallback: check everywhere if not found in specified source
    if (!cardToMove) {
      const idx = newUngrouped.findIndex(c => cardKey(c) === draggedCardId);
      if (idx !== -1) {
        cardToMove = newUngrouped[idx];
        newUngrouped.splice(idx, 1);
      } else {
        newGroups = groups.map(g => {
          const cIdx = g.items.findIndex(c => cardKey(c) === draggedCardId);
          if (cIdx !== -1 && !cardToMove) {
            cardToMove = g.items[cIdx];
            const newItems = [...g.items];
            newItems.splice(cIdx, 1);
            return { ...g, items: newItems };
          }
          return g;
        });
      }
    }

    if (!cardToMove) return;

    // 2. Insert card into target group
    if (targetGroupId === "ungrouped") {
      if (targetCardIndex !== null && targetCardIndex !== undefined) {
        newUngrouped.splice(targetCardIndex, 0, cardToMove);
      } else {
        newUngrouped.push(cardToMove);
      }
    } else {
      newGroups = newGroups.map(g => {
        if (g.id === targetGroupId) {
          const newItems = [...g.items];
          if (targetCardIndex !== null && targetCardIndex !== undefined) {
            newItems.splice(targetCardIndex, 0, cardToMove);
          } else {
            newItems.push(cardToMove);
          }
          return { ...g, items: newItems };
        }
        return g;
      });
    }

    newGroups = newGroups.filter(g => g.items.length > 0);

    setGroups(newGroups);
    setUngrouped(newUngrouped);

    const flatOrder = [...newGroups.flatMap(g => g.items), ...newUngrouped];
    onReorder?.(flatOrder);
  };

  const handleDragOverCard = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDropOnCard = (event, targetGroupId, targetCardIndex) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedCardId = event.dataTransfer.getData("application/x-rummy-card-id") || (window.__rummyDraggedCard ? cardKey(window.__rummyDraggedCard) : null);
    const sourceGroupId = event.dataTransfer.getData("application/x-rummy-source-group") || window.__rummyDraggedCardSourceGroup;

    if (draggedCardId) {
      moveCard(draggedCardId, sourceGroupId, targetGroupId, targetCardIndex);
    }
  };

  const handleDragOverGroup = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDropOnGroup = (event, targetGroupId) => {
    event.preventDefault();
    const draggedCardId = event.dataTransfer.getData("application/x-rummy-card-id") || (window.__rummyDraggedCard ? cardKey(window.__rummyDraggedCard) : null);
    const sourceGroupId = event.dataTransfer.getData("application/x-rummy-source-group") || window.__rummyDraggedCardSourceGroup;

    if (draggedCardId) {
      moveCard(draggedCardId, sourceGroupId, targetGroupId, null);
    }
  };

  const handleCreateGroupFromSelected = () => {
    if (selectedKeys.size === 0) return;

    const selectedCards = [];
    
    // Extract selected cards from ungrouped
    const nextUngrouped = ungrouped.filter(card => {
      const key = cardKey(card);
      if (selectedKeys.has(key)) {
        selectedCards.push(card);
        return false;
      }
      return true;
    });

    // Extract selected cards from existing groups
    let nextGroups = groups.map(g => {
      const itemsToKeep = g.items.filter(card => {
        const key = cardKey(card);
        if (selectedKeys.has(key)) {
          selectedCards.push(card);
          return false;
        }
        return true;
      });
      return { ...g, items: itemsToKeep };
    }).filter(g => g.items.length > 0);

    if (selectedCards.length > 0) {
      const newGroup = {
        id: `group-${Date.now()}`,
        items: selectedCards
      };
      nextGroups.push(newGroup);
    }

    setGroups(nextGroups);
    setUngrouped(nextUngrouped);
    setSelectedKeys(new Set());

    const flatOrder = [...nextGroups.flatMap(g => g.items), ...nextUngrouped];
    onReorder?.(flatOrder);
  };

  const totalCards = ungrouped.length + groups.reduce((n, g) => n + (g.items?.length || 0), 0);

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
          <span>{totalCards} cards • select cards to group • drag to sort • drag a card to the open pile</span>
        </div>
        <div className="smart-hand-strip" aria-label="Smart grouping status">
          <button
            type="button"
            className="rummy-group-btn"
            disabled={selectedKeys.size === 0}
            onClick={handleCreateGroupFromSelected}
          >
            {selectedKeys.size > 0 ? `Group (${selectedKeys.size})` : "Group"}
          </button>
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
            <div
              key={group.id}
              className={`rummy-card-group ${group.virtual ? "ungrouped-free" : ""}`}
              onDragOver={handleDragOverGroup}
              onDrop={(event) => handleDropOnGroup(event, group.id)}
            >
              <button
                type="button"
                className="group-select"
              >
                {group.items.map((card, cardIndex) => (
                  <Card
                    key={cardKey(card)}
                    card={card}
                    selected={selectedKeys.has(cardKey(card))}
                    onNativeDragStart={(event) => handleNativeDragStart(event, card, group.id)}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onDragOver={handleDragOverCard}
                    onDrop={(event) => handleDropOnCard(event, group.id, cardIndex)}
                    isHidden={animatingCardId && cardKey(card) === animatingCardId}
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
