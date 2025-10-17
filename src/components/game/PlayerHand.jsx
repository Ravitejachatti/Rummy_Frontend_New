// client/src/components/game/PlayerHand.jsx
import React, { useEffect, useState, useRef } from "react";

// ---------- PlayingCard ----------
const glyph = (s) =>
  s === "Hearts" ? "♥" : s === "Diamonds" ? "♦" : s === "Clubs" ? "♣" : "♠";

const suitColor = (s) =>
  s === "Hearts" || s === "Diamonds" ? "text-red-600" : "text-gray-900";

const SIZE_MAP = {
  sm: { w: "w-14", h: "h-20", font: "text-lg" },
  md: { w: "w-16", h: "h-24", font: "text-xl" },
  lg: { w: "w-20", h: "h-28", font: "text-2xl" },
};

function PlayingCard({ card, size = "md", selected = false, onClick }) {
  if (!card) return null;
  const color = suitColor(card.suit);
  const sz = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl shadow-md border transition-all duration-150 select-none cursor-pointer
        ${sz.w} ${sz.h} ${color}
        ${selected ? "ring-2 ring-amber-400 border-amber-400 scale-105" : "border-gray-200"}
        hover:-translate-y-1
        flex items-start justify-start`}
    >
      <div className="p-1">
        <div
          className={`flex flex-col items-start justify-start leading-tight ${sz.font} font-bold`}
        >
          <span>{card.rank}</span>
          <span className="-mt-1">{glyph(card.suit)}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- PlayerHand ----------
export default function PlayerHand({ cards = [], isMyTurn = false, onDiscard }) {
  const [ungrouped, setUngrouped] = useState(cards);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setUngrouped(cards);
    setSelected(new Set());
  }, [cards]);

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
    setGroups((g) => [...g, { id: Date.now().toString(), name: type, items: chosen }]);
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
          const copy = structuredClone(prev);
          copy[gIdx].items.splice(index, 1);
          if (copy[gIdx].items.length === 0) copy.splice(gIdx, 1);
          return copy;
        });
        setSelectedGroup(null);
      }
    }
  };

  // ---------- Custom Drag Logic (within ungrouped & within same group) ----------
  const dragState = useRef(null);

  const handleMouseDown = (e, zone, index) => {
    dragState.current = { zone, index, startX: e.clientX, currentX: e.clientX };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragState.current) return;
    dragState.current.currentX = e.clientX;
    const el = document.getElementById(`drag-${dragState.current.zone}-${dragState.current.index}`);
    if (el) {
      el.style.position = "relative";
      el.style.zIndex = 999;
      el.style.transform = `translateX(${e.clientX - dragState.current.startX}px) scale(1.05)`;
    }
  };

  const handleMouseUp = (e) => {
    if (!dragState.current) return;
    const { zone, index, startX, currentX } = dragState.current;
    const delta = currentX - startX;

    // compute new index based on direction
    const targetIndex =
      Math.max(0, Math.min(getZone(zone).length - 1, index + Math.round(delta / 60)));

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

    // Reset transform
    const el = document.getElementById(`drag-${zone}-${index}`);
    if (el) {
      el.style.transform = "";
      el.style.zIndex = "";
    }

    dragState.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const getZone = (zone) => {
    if (zone === "ungrouped") return ungrouped;
    const group = groups.find((g) => g.id === zone);
    return group ? group.items : [];
  };

  // ---------- UI ----------
  const totalCards = ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div className="w-full h-full flex flex-col justify-end p-2 select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-1 text-xs text-white/70">
        <div>
          {totalCards} cards
          {selected.size > 0 && ` • ${selected.size} selected`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGroupSelected}
            disabled={selected.size === 0}
            className="bg-amber-500 text-black font-semibold px-3 py-1 rounded-full disabled:opacity-40 hover:bg-amber-400"
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
            className="bg-blue-500 text-white font-semibold px-3 py-1 rounded-full disabled:opacity-40 hover:bg-blue-400"
          >
            Discard
          </button>
        </div>
      </div>

      {/* Zones */}
      <div
        ref={containerRef}
        className="flex justify-center items-end flex-nowrap overflow-x-auto pb-2"
      >
        {/* Groups */}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col items-center mr-8 flex-shrink-0">
            <div className="relative flex items-end">
              {g.items.map((card, i) => (
                <div
                  key={`group-${g.id}-${i}`}
                  id={`drag-${g.id}-${i}`}
                  onMouseDown={(e) => handleMouseDown(e, g.id, i)}
                  className="transition-transform duration-150"
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

            <div className="flex items-center gap-1">
              <div className="text-[10px] text-white bg-green-600 rounded-b-md font-semibold mt-0.5 px-3 py-[2px]">
                {g.name}
              </div>
              <button
                onClick={() => handleUngroup(g.id)}
                className="text-[10px] text-white bg-red-600 rounded-md font-semibold mt-0.5 px-2 py-[2px] hover:bg-red-500"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative flex items-end">
            {ungrouped.map((card, i) => (
              <div
                key={`ungrouped-${i}`}
                id={`drag-ungrouped-${i}`}
                onMouseDown={(e) => handleMouseDown(e, "ungrouped", i)}
                className="transition-transform duration-150"
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
            <div className="text-[10px] text-white bg-gray-700 rounded-b-md font-semibold mt-0.5 px-3 py-[2px]">
              Ungrouped
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
