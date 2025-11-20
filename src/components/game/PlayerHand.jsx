// client/src/components/game/PlayerHand.jsx
import React, { useEffect, useState, useRef } from "react";
import { getCardImage } from "../utils/cardimages";

// ---------- Utils ----------
const glyph = (s) =>
  s === "Hearts" ? "♥" : s === "Diamonds" ? "♦" : s === "Clubs" ? "♣" : "♠";

const suitColor = (s) =>
  s === "Hearts" || s === "Diamonds" ? "text-red-600" : "text-gray-900";

// Responsive card sizes - optimized for mobile landscape
const SIZE_MAP = {
  sm: { w: "w-11", h: "h-16", font: "text-sm" },
  md: { w: "w-14", h: "h-20", font: "text-base" },
  lg: { w: "w-16", h: "h-24", font: "text-lg" },
};

// Build a simple comparable key
const cardKey = (c) => `${c?.rank}|${c?.suit}`;

/**
 * Reconcile incoming "cards" with local groups
 */
function reconcileHandWithGroups(cards, groups) {
  const used = new Array(cards.length).fill(false);

  const findAndUse = (cardLike) => {
    const key = cardKey(cardLike);
    for (let i = 0; i < cards.length; i++) {
      if (!used[i] && cardKey(cards[i]) === key) {
        used[i] = true;
        return cards[i];
      }
    }
    return null;
  };

  const newGroups = groups
    .map((g) => {
      const kept = [];
      for (const it of g.items || []) {
        const matched = findAndUse(it);
        if (matched) kept.push(matched);
      }
      return kept.length > 0 ? { ...g, items: kept } : null;
    })
    .filter(Boolean);

  const newUngrouped = [];
  for (let i = 0; i < cards.length; i++) {
    if (!used[i]) newUngrouped.push(cards[i]);
  }

  return { newGroups, newUngrouped };

}

// ---------- PlayingCard ----------
function PlayingCard({ card, size = "sm", selected = false, onClick }) {
  if (!card) return null;
  const sz = SIZE_MAP[size] || SIZE_MAP.sm;
  const imgSrc = getCardImage(card);

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-lg shadow-md border transition-all duration-150 select-none cursor-pointer
        ${sz.w} ${sz.h}
        ${
          selected
            ? "ring-2 ring-amber-400 border-amber-400 scale-105"
            : "border-gray-200"
        }
        hover:-translate-y-1
        flex items-center justify-center overflow-hidden`}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`${card.rank} of ${card.suit}`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        // Fallback to old text style if image not found
        <div className="p-0.5">
          <div
            className={`flex flex-col items-start justify-start leading-none ${
              sz.font
            } font-bold ${suitColor(card.suit)}`}
          >
            <span>{card.rank}</span>
            <span className="-mt-0.5">{glyph(card.suit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- PlayerHand ----------
export default function PlayerHand({
  cards = [],
  isMyTurn = false,
  onDiscard,
  onGroupsChange,
}) {
  const [ungrouped, setUngrouped] = useState(cards);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const containerRef = useRef(null);


  useEffect(() => {
  if (cards[0]) {
    console.log("Example card:", cards[0], getCardImage(cards[0]));
  }
}, [cards]);

  // Notify parent when groups/ungrouped change
  const lastSnapshotRef = useRef("");
  useEffect(() => {
    const snapshot = JSON.stringify({ groups, ungrouped });
    if (lastSnapshotRef.current !== snapshot) {
      onGroupsChange?.({ groups, ungrouped });
      lastSnapshotRef.current = snapshot;
    }
  }, [groups, ungrouped, onGroupsChange]);

  // Reconcile on incoming hand changes
  useEffect(() => {
    const { newGroups, newUngrouped } = reconcileHandWithGroups(cards, groups);
    setGroups(newGroups);
    setUngrouped(newUngrouped);
    setSelected(new Set());
    setSelectedGroup(null);
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Selection ----------
  const toggleSelect = (index) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(index) ? n.delete(index) : n.add(index);
      return n;
    });
    setSelectedGroup(null);
  };

  // ---------- Group ----------
  const handleGroupSelected = () => {
    if (selected.size === 0) return;
    const type = prompt("Enter group name (Pure / Impure / Set / 1st Life)", "Pure");
    if (!type) return;

    const ids = Array.from(selected).sort((a, b) => a - b);
    const chosen = ids.map((i) => ungrouped[i]);

    const remaining = [...ungrouped];
    for (let i = ids.length - 1; i >= 0; i--) remaining.splice(ids[i], 1);

    setUngrouped(remaining);
    setGroups((g) => [
      ...g,
      { id: Date.now().toString(), name: type, items: chosen },
    ]);
    setSelected(new Set());
  };

  // ---------- Ungroup ----------
  const handleUngroup = (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    setUngrouped((prev) => [...prev, ...group.items]);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedGroup(null);
  };

  // ---------- Discard ----------
  const handleDiscard = () => {
    if (!isMyTurn) return;

    if (selected.size === 1) {
      const idx = Array.from(selected)[0];
      const card = ungrouped[idx];
      if (!card) return;
      onDiscard?.(card);
      const next = [...ungrouped];
      next.splice(idx, 1);
      setUngrouped(next);
      setSelected(new Set());
    } else if (selectedGroup) {
      const { gid, index } = selectedGroup;
      const gIdx = groups.findIndex((g) => g.id === gid);
      if (gIdx >= 0 && groups[gIdx].items[index]) {
        const card = groups[gIdx].items[index];
        onDiscard?.(card);
        setGroups((prev) => {
          const copy = prev.map((g) => ({ ...g, items: [...g.items] }));
          copy[gIdx].items.splice(index, 1);
          if (copy[gIdx].items.length === 0) copy.splice(gIdx, 1);
          return copy;
        });
        setSelectedGroup(null);
      }
    }
  };

  // ---------- Enhanced Drag & Drop with Smooth Animations ----------
  const dragState = useRef(null);
  const animationFrameRef = useRef(null);
  const ghostCardsRef = useRef(new Map());

  const getClientX = (e) => {
    if (typeof e.clientX === "number") return e.clientX;
    if (e.touches && e.touches[0]) return e.touches[0].clientX;
    return 0;
  };

  const getZone = (zone) => {
    if (zone === "ungrouped") return ungrouped;
    const group = groups.find((g) => g.id === zone);
    return group ? group.items : [];
  };

  const handlePointerDown = (e, zone, index) => {
    // Prevent text selection and default behaviors
    e.preventDefault();
    e.stopPropagation();

    const x = getClientX(e);
    const el = document.getElementById(`drag-${zone}-${index}`);
    
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cardWidth = rect.width;
    const cardHeight = rect.height;

    // Store initial positions of all cards in the zone for smooth reordering
    const zoneArr = getZone(zone);
    const initialPositions = new Map();
    
    zoneArr.forEach((_, i) => {
      const cardEl = document.getElementById(`drag-${zone}-${i}`);
      if (cardEl) {
        const cardRect = cardEl.getBoundingClientRect();
        initialPositions.set(i, {
          x: cardRect.left,
          y: cardRect.top,
        });
      }
    });

    dragState.current = {
      zone,
      index,
      startX: x,
      currentX: x,
      cardWidth,
      cardHeight,
      isDragging: false,
      dragThreshold: 5, // Minimum pixels before drag starts
      currentTargetIndex: index,
      initialPositions,
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const updateCardPositions = () => {
    if (!dragState.current || !dragState.current.isDragging) return;

    const { zone, index, currentX, startX, currentTargetIndex, initialPositions } = dragState.current;
    const deltaX = currentX - startX;
    const zoneArr = getZone(zone);

    // Update dragged card position
    const draggedEl = document.getElementById(`drag-${zone}-${index}`);
    if (draggedEl) {
      draggedEl.style.position = "relative";
      draggedEl.style.zIndex = "999";
      draggedEl.style.transition = "none";
      draggedEl.style.transform = `translateX(${deltaX}px) translateY(-8px) scale(1.08)`;
      draggedEl.style.filter = "drop-shadow(0 10px 20px rgba(0,0,0,0.3))";
    }

    // Smoothly animate other cards to their new positions
    zoneArr.forEach((_, i) => {
      if (i === index) return; // Skip the dragged card

      const cardEl = document.getElementById(`drag-${zone}-${i}`);
      if (!cardEl) return;

      let targetOffset = 0;

      // Calculate position based on where the card should move to
      if (currentTargetIndex !== index) {
        if (index < currentTargetIndex) {
          // Dragging right - shift cards left
          if (i > index && i <= currentTargetIndex) {
            targetOffset = -dragState.current.cardWidth - 2; // -2 for gap
          }
        } else {
          // Dragging left - shift cards right
          if (i >= currentTargetIndex && i < index) {
            targetOffset = dragState.current.cardWidth + 2; // +2 for gap
          }
        }
      }

      cardEl.style.position = "relative";
      cardEl.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
      cardEl.style.transform = `translateX(${targetOffset}px)`;
    });
  };

  const handlePointerMove = (e) => {
    if (!dragState.current) return;

    const x = getClientX(e);
    const prevX = dragState.current.currentX;
    dragState.current.currentX = x;

    // Check if we've exceeded drag threshold
    if (!dragState.current.isDragging) {
      const distance = Math.abs(x - dragState.current.startX);
      if (distance > dragState.current.dragThreshold) {
        dragState.current.isDragging = true;
      } else {
        return; // Don't start dragging yet
      }
    }

    const { zone, index, startX, cardWidth } = dragState.current;
    const deltaX = x - startX;

    // Calculate target index based on drag position
    const zoneArr = getZone(zone);
    const displacement = Math.round(deltaX / (cardWidth + 2)); // +2 for gap
    let newTargetIndex = Math.max(0, Math.min(zoneArr.length - 1, index + displacement));

    // Update target index if it changed
    if (newTargetIndex !== dragState.current.currentTargetIndex) {
      dragState.current.currentTargetIndex = newTargetIndex;
    }

    // Use RAF for smooth 60fps animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateCardPositions);

    // Prevent scrolling while dragging
    if (e.cancelable) e.preventDefault();
  };

  const handlePointerUp = (e) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!dragState.current) {
      cleanupDragListeners();
      return;
    }

    const { zone, index, isDragging, currentTargetIndex } = dragState.current;

    // If we never started dragging (below threshold), treat as a click
    if (!isDragging) {
      resetAllStyles(zone);
      dragState.current = null;
      cleanupDragListeners();
      return;
    }

    const zoneArr = getZone(zone);
    if (!zoneArr || zoneArr.length === 0) {
      resetAllStyles(zone);
      dragState.current = null;
      cleanupDragListeners();
      return;
    }

    const targetIndex = currentTargetIndex;

    // Perform reorder if position changed
    if (targetIndex !== index) {
      if (zone === "ungrouped") {
        setUngrouped((prev) => {
          const arr = [...prev];
          const [moved] = arr.splice(index, 1);
          arr.splice(targetIndex, 0, moved);
          return arr;
        });
      } else {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === zone
              ? {
                  ...g,
                  items: (() => {
                    const arr = [...g.items];
                    const [moved] = arr.splice(index, 1);
                    arr.splice(targetIndex, 0, moved);
                    return arr;
                  })(),
                }
              : g
          )
        );
      }
    }

    // Smooth reset animation
    resetAllStyles(zone);
    dragState.current = null;
    cleanupDragListeners();
  };

  const resetAllStyles = (zone) => {
    const zoneArr = getZone(zone);
    if (!zoneArr) return;

    zoneArr.forEach((_, i) => {
      const el = document.getElementById(`drag-${zone}-${i}`);
      if (el) {
        el.style.transition = "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.transform = "";
        el.style.zIndex = "";
        el.style.position = "";
        el.style.filter = "";
        
        // Remove transition after animation completes
        setTimeout(() => {
          if (el) el.style.transition = "";
        }, 200);
      }
    });
  };

  const cleanupDragListeners = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
  };

  // Clean up if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cleanupDragListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- UI ----------
  const totalCards =
    ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div className="w-full h-full flex flex-col justify-end px-1 py-1 select-none">
      {/* Top Controls - Mobile optimized */}
      <div className="flex items-center justify-between mb-0.5 text-[10px] sm:text-xs text-white/80">
        <div className="flex items-center gap-1">
          <span className="font-medium">{totalCards}</span>
          {selected.size > 0 && (
            <>
              <span className="text-white/50">•</span>
              <span className="text-amber-400">{selected.size} selected</span>
            </>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleGroupSelected}
            disabled={selected.size === 0}
            className="bg-amber-500 text-black font-semibold px-2 py-0.5 rounded-full text-[10px] disabled:opacity-40 hover:bg-amber-400 active:scale-95"
          >
            Group ({selected.size})
          </button>
          <button
            onClick={handleDiscard}
            disabled={
              !isMyTurn ||
              !(
                selected.size === 1 ||
                (selectedGroup && selectedGroup.index != null)
              )
            }
            className="bg-blue-500 text-white font-semibold px-2 py-0.5 rounded-full text-[10px] disabled:opacity-40 hover:bg-blue-400 active:scale-95"
          >
            Discard
          </button>
        </div>
      </div>

      {/* Cards Container - Centered with horizontal scroll for mobile */}
      <div
        ref={containerRef}
        className="flex justify-center items-end gap-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        style={{
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Groups */}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col items-center flex-shrink-0">
            <div className="relative flex items-end gap-0.5">
              {g.items.map((card, i) => (
                <div
                  key={`group-${g.id}-${i}`}
                  id={`drag-${g.id}-${i}`}
                  onPointerDown={(e) => handlePointerDown(e, g.id, i)}
                  className="cursor-grab active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                >
                  <PlayingCard
                    card={card}
                    size="sm"
                    selected={
                      selectedGroup &&
                      selectedGroup.gid === g.id &&
                      selectedGroup.index === i
                    }
                    onClick={() => {
                      setSelected(new Set());
                      setSelectedGroup(
                        selectedGroup &&
                          selectedGroup.gid === g.id &&
                          selectedGroup.index === i
                          ? null
                          : { gid: g.id, index: i }
                      );
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-0.5 mt-0.5">
              <div className="text-[9px] text-white bg-green-600 rounded-b-md font-semibold px-1.5 py-[1px]">
                {g.name}
              </div>
              <button
                onClick={() => handleUngroup(g.id)}
                className="text-[9px] text-white bg-red-600 rounded-md font-semibold px-1 py-[1px] hover:bg-red-500 active:scale-95"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative flex items-end gap-0.5">
            {ungrouped.map((card, i) => (
              <div
                key={`ungrouped-${i}`}
                id={`drag-ungrouped-${i}`}
                onPointerDown={(e) => handlePointerDown(e, "ungrouped", i)}
                className="cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <PlayingCard
                  card={card}
                  size="sm"
                  selected={selected.has(i)}
                  onClick={() => toggleSelect(i)}
                />
              </div>
            ))}
          </div>
          {ungrouped.length > 0 && (
            <div className="text-[9px] text-white bg-gray-700 rounded-b-md font-semibold mt-0.5 px-1.5 py-[1px]">
              Ungrouped
            </div>
          )}
        </div>
      </div>
    </div>
  );
}