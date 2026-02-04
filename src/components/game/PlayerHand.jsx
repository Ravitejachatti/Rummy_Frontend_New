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
        ${selected
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
            className={`flex flex-col items-start justify-start leading-none ${sz.font
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

    // selected card indices from ungrouped
    const ids = Array.from(selected).sort((a, b) => a - b);
    const chosen = ids.map((i) => ungrouped[i]);

    const remaining = [...ungrouped];
    for (let i = ids.length - 1; i >= 0; i--) {
      remaining.splice(ids[i], 1);
    }

    setUngrouped(remaining);
    setGroups((g) => [
      ...g,
      { id: Date.now().toString(), items: chosen }, // just id + items
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

  // ---------- Enhanced Drag & Drop with Cross-Zone Support ----------
  const dragState = useRef(null);
  const animationFrameRef = useRef(null);

  const getClientCoords = (e) => {
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: 0, y: 0 };
  };

  const getZone = (zone) => {
    if (zone === "ungrouped") return ungrouped;
    const group = groups.find((g) => g.id === zone);
    return group ? group.items : [];
  };

  const handlePointerDown = (e, zone, index) => {
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getClientCoords(e);
    const el = document.getElementById(`drag-${zone}-${index}`);

    if (!el) return;

    const rect = el.getBoundingClientRect();

    dragState.current = {
      zone,
      index,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      cardWidth: rect.width,
      isDragging: false,
      dragThreshold: 5,
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const updateCardPositions = () => {
    if (!dragState.current || !dragState.current.isDragging) return;

    const { zone, index, currentX, currentY, startX, startY } = dragState.current;

    // Move the dragged card visibly
    const draggedEl = document.getElementById(`drag-${zone}-${index}`);
    if (draggedEl) {
      const dx = currentX - startX;
      const dy = currentY - startY;

      draggedEl.style.position = "relative";
      draggedEl.style.zIndex = "999";
      draggedEl.style.transition = "none";
      draggedEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      draggedEl.style.filter = "drop-shadow(0 10px 20px rgba(0,0,0,0.3))";
    }
  };

  const handlePointerMove = (e) => {
    if (!dragState.current) return;

    const { x, y } = getClientCoords(e);
    dragState.current.currentX = x;
    dragState.current.currentY = y;

    if (!dragState.current.isDragging) {
      const d = Math.sqrt(Math.pow(x - dragState.current.startX, 2) + Math.pow(y - dragState.current.startY, 2));
      if (d > dragState.current.dragThreshold) {
        dragState.current.isDragging = true;
      } else {
        return;
      }
    }

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(updateCardPositions);

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

    const { zone, index, isDragging, currentX, currentY } = dragState.current;

    // Click handling
    if (!isDragging) {
      resetAllStyles(zone);
      dragState.current = null;
      cleanupDragListeners();
      return;
    }

    // --- HIT TESTING (Cross-Zone) ---
    // 1. Check if dropped on a specific group zone
    let targetZoneId = null;

    // Check groups first
    for (const g of groups) {
      const zoneEl = document.getElementById(`zone-${g.id}`);
      if (zoneEl) {
        const rect = zoneEl.getBoundingClientRect();
        if (currentX >= rect.left && currentX <= rect.right && currentY >= rect.top && currentY <= rect.bottom) {
          targetZoneId = g.id;
          break;
        }
      }
    }

    // Check ungrouped zone if not found in groups
    if (!targetZoneId) {
      const ungroupedEl = document.getElementById("zone-ungrouped");
      if (ungroupedEl) {
        const rect = ungroupedEl.getBoundingClientRect();
        // Give the ungrouped zone a bit more vertical leniency for easy drops
        if (currentX >= rect.left && currentX <= rect.right && currentY >= (rect.top - 50) && currentY <= (rect.bottom + 50)) {
          targetZoneId = "ungrouped";
        }
      }
    }

    // If we have a valid target zone
    if (targetZoneId) {
      // Logic for Same-Zone Reorder vs Cross-Zone Move
      if (targetZoneId === zone) {
        // --- Reorder Logic (Simplistic: based on proximity to other cards in zone) ---
        // For simplicity reusing the original "displacement" logic or just finding closest index
        // Since we didn't track "currentTargetIndex" during move to keep it light, let's calc it now

        const zoneItems = getZone(zone);
        let dropIndex = zoneItems.length - 1;

        // Find insertion index based on X position
        // We iterate through cards in this zone to see where we fit
        let found = false;
        for (let i = 0; i < zoneItems.length; i++) {
          const cardEl = document.getElementById(`drag-${zone}-${i}`);
          if (cardEl && i !== index) {
            const cr = cardEl.getBoundingClientRect();
            if (currentX < cr.left + cr.width / 2) {
              dropIndex = i > index ? i - 1 : i;
              found = true;
              break;
            }
          }
        }
        if (!found) dropIndex = zoneItems.length - 1;

        if (dropIndex !== index && dropIndex >= 0) {
          moveCardInternal(zone, index, zone, dropIndex);
        }

      } else {
        // --- Cross-Zone Move Logic ---
        // Append to end of target zone for simplicity
        const targetItems = getZone(targetZoneId);
        moveCardInternal(zone, index, targetZoneId, targetItems.length);
      }
    }

    resetAllStyles(zone);
    dragState.current = null;
    cleanupDragListeners();
  };

  const moveCardInternal = (fromZone, fromIndex, toZone, toIndex) => {
    // If same zone
    if (fromZone === toZone) {
      if (fromZone === "ungrouped") {
        setUngrouped(prev => {
          const arr = [...prev];
          const [item] = arr.splice(fromIndex, 1);
          arr.splice(toIndex, 0, item);
          return arr;
        });
      } else {
        setGroups(prev => prev.map(g => {
          if (g.id === fromZone) {
            const arr = [...g.items];
            const [item] = arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, item);
            return { ...g, items: arr };
          }
          return g;
        }));
      }
      return;
    }

    // Cross zone
    let sourceArr, destArr;

    // 1. Get Source Array & Item
    if (fromZone === "ungrouped") sourceArr = [...ungrouped];
    else sourceArr = [...groups.find(g => g.id === fromZone).items];

    // Safety check
    if (!sourceArr[fromIndex]) return;

    const [movedItem] = sourceArr.splice(fromIndex, 1);

    // 2. Get Dest Array
    if (toZone === "ungrouped") destArr = [...ungrouped];
    else destArr = [...groups.find(g => g.id === toZone).items];

    destArr.splice(toIndex, 0, movedItem);

    // 3. Apply updates
    const newUngrouped = fromZone === "ungrouped" ? sourceArr : (toZone === "ungrouped" ? destArr : ungrouped);

    const newGroups = groups.map(g => {
      if (g.id === fromZone) return { ...g, items: sourceArr };
      if (g.id === toZone) return { ...g, items: destArr };
      return g;
    });

    setUngrouped(newUngrouped);

    // Auto-delete empty groups? For now let's keep them so user can drag back if they want.
    // If we want to delete empty groups:
    // setGroups(newGroups.filter(g => g.items.length > 0));
    setGroups(newGroups);
  };


  const resetAllStyles = (zone) => {
    // Simply reset the dragged element
    // We don't track all moved elements in this lighter implementation
    const { index } = dragState.current;
    const el = document.getElementById(`drag-${zone}-${index}`);
    if (el) {
      el.style.transition = "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.transform = "";
      el.style.zIndex = "";
      el.style.position = "";
      el.style.filter = "";
      setTimeout(() => { if (el) el.style.transition = ""; }, 200);
    }
  };

  const cleanupDragListeners = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      cleanupDragListeners();
    };
  }, []);

  const totalCards =
    ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div className="w-full h-full flex flex-col justify-end px-1 py-1 select-none">
      {/* Top Controls */}
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

      {/* Cards Container */}
      <div
        ref={containerRef}
        className="flex justify-center items-end gap-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {/* Groups */}
        {groups.map((g) => (
          <div
            key={g.id}
            id={`zone-${g.id}`}
            className="flex flex-col items-center flex-shrink-0 relative rounded-lg bg-white/5 p-1 border border-white/5 min-w-[3rem] min-h-[5rem] transition-colors hover:bg-white/10"
          >
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

            <div className="flex items-center justify-center mt-0.5">
              <button
                onClick={() => handleUngroup(g.id)}
                className="text-[9px] text-white bg-red-600 rounded-md font-semibold px-1.5 py-[1px] hover:bg-red-500 active:scale-95"
              >
                Ungroup
              </button>
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        <div
          id="zone-ungrouped"
          className="flex flex-col items-center flex-shrink-0 rounded-lg p-1 border border-transparent min-w-[3rem] min-h-[5rem] transition-colors hover:bg-white/5"
        >
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