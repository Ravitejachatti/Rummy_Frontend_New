import React, { useEffect, useState } from "react";
import PlayingCard from "./PlayingCard";

export default function PlayerHand({
  cards = [],
  isMyTurn = false,
  onDiscard,
}) {
  const [ungrouped, setUngrouped] = useState(cards);
  const [groups, setGroups] = useState([]); // [{id,name,items:[]}]
  const [selected, setSelected] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => setUngrouped(cards), [cards]);

  // ---------- Selection ----------
  const toggleSelect = (index) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(index) ? n.delete(index) : n.add(index);
      return n;
    });
  };

  // ---------- Group ----------
  const handleGroupSelected = () => {
    if (selected.size === 0) return;
    const type =
      prompt("Enter group name (Pure / Impure / Set / 1st Life)", "Pure") ||
      "Group";

    const ids = Array.from(selected).sort((a, b) => a - b);
    const chosen = ids.map((i) => ungrouped[i]);
    const remaining = [...ungrouped];
    for (let i = ids.length - 1; i >= 0; i--) remaining.splice(ids[i], 1);

    setUngrouped(remaining);
    setGroups((g) => [...g, { id: Date.now(), name: type, items: chosen }]);
    setSelected(new Set());
  };

  // ---------- Discard ----------
  const handleDiscard = () => {
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

  // ---------- Layout constants ----------
  const overlap = 45; // tighter overlap (shows rank + suit clearly)
  const groupGap = 40; // visible gap between groups

  return (
    <div className="w-full h-full flex flex-col justify-end p-2 select-none">
      {/* Controls */}
      <div className="flex items-center justify-between mb-1 text-xs text-white/70">
        <div>{ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0)} cards</div>
        <div className="flex gap-2">
          <button
            onClick={handleGroupSelected}
            disabled={selected.size === 0}
            className="bg-amber-500 text-black font-semibold px-3 py-1 rounded-full disabled:opacity-40"
          >
            Group
          </button>
          <button
            onClick={handleDiscard}
            disabled={
              !(
                selected.size === 1 ||
                (selectedGroup && selectedGroup.index != null)
              )
            }
            className="bg-blue-500 text-white font-semibold px-3 py-1 rounded-full disabled:opacity-40"
          >
            Discard
          </button>
        </div>
      </div>

      {/* All groups + ungrouped in one line */}

      <div className="flex justify-center items-end flex-nowrap overflow-hidden">
        {/* Groups */}
        {groups.map((g) => (
          <div
            key={g.id}
            className="flex flex-col items-center"
            style={{ marginRight: "32px" }} // spacing between groups
          >
            <div className="relative flex items-end">
              {g.items.map((card, i) => {
                const isSel =
                  selectedGroup &&
                  selectedGroup.gid === g.id &&
                  selectedGroup.index === i;
                return (
                  <div
                    key={`${card.rank}-${card.suit}-${i}`}
                    style={{
                      marginLeft: i === 0 ? 0 : -18,       // smaller overlap = more visible
                      zIndex: i,
                      transform: "translateY(0px)",            // remove downward stacking
                    }}
                    onClick={() =>
                      setSelectedGroup(
                        isSel ? null : { gid: g.id, index: i }
                      )
                    }
                  >
                    <PlayingCard
                      card={card}
                      size="sm"
                      selected={isSel}
                      disabled={!isMyTurn}
                    />
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-white bg-green-600 rounded-b-md font-semibold mt-0.5 px-3 py-[2px]">
              {g.name}
            </div>
          </div>
        ))}


        {/* Ungrouped (same layout as groups) */}
      <div className="flex flex-col items-center">
        <div className="relative flex items-end">
          {ungrouped.map((card, index) => {
            const isSelected = selected.has(index);
            return (
              <div
                key={`${card.rank}-${card.suit}-${index}`}
                  style={{
                    marginLeft: index === 0 ? 0 : -18,       // smaller overlap = more visible
                    zIndex: index,
                    transform: "translateY(0px)",            // remove downward stacking
                  }}
                onClick={() => toggleSelect(index)}
              >
                <PlayingCard
                  card={card}
                  size="sm"
                  selected={isSelected}
                  disabled={!isMyTurn}
                />
              </div>
            );
          })}
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



// client/src/components/game/PlayingCard.jsx
import React from "react";

const glyph = (s) =>
  s === "Hearts" ? "♥" : s === "Diamonds" ? "♦" : s === "Clubs" ? "♣" : "♠";

const suitColor = (s) =>
  s === "Hearts" || s === "Diamonds" ? "text-red-600" : "text-gray-900";

const SIZE_MAP = {
  sm: { w: "w-14", h: "h-20", font: "text-lg" },   // grouped
  md: { w: "w-16", h: "h-24", font: "text-xl" },   // for hand
  lg: { w: "w-20", h: "h-28", font: "text-2xl" },  // if you want even larger later
};

export default function PlayingCard({
  card,
  size = "md",
  selected = false,
  disabled = false,
}) {
  if (!card) return null;
  const color = suitColor(card.suit);
  const sz = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative bg-white rounded-xl shadow-md border transition-all duration-150 select-none
      ${sz.w} ${sz.h} ${color}
      ${selected ? "ring-2 ring-amber-400 border-amber-400 scale-105" : "border-gray-200"}
      ${disabled ? "opacity-70" : "hover:-translate-y-1"}
      flex items-start justify-start`}
    >
      <div className="p-1">
        <div className={`flex flex-col items-start justify-start leading-tight ${sz.font} font-bold`}>
          <span>{card.rank}</span>
          <span className="-mt-1">{glyph(card.suit)}</span>
        </div>
      </div>
    </div>
  );
}