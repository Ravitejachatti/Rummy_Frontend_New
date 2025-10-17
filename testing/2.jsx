import React, { useEffect, useState } from "react";
import PlayingCard from "./PlayingCard";

export default function PlayerHand({
  cards = [],
  isMyTurn = false,
  onReorder,
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
  const totalCards = ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0);
  const overlap = totalCards > 13 ? 28 : 32; // tighter overlap if >13 cards

  return (
    <div className="w-full h-full flex flex-col justify-end p-2 select-none">
      {/* Top controls */}
      <div className="flex items-center justify-between mb-1 text-xs text-white/70">
        <div>{totalCards} cards</div>
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

      {/* Full hand row */}
      <div className="relative w-full flex justify-center items-end">
        {/* Groups */}
        {groups.map((g) => (
          <div
            key={g.id}
            className="relative flex flex-col items-center mx-[2px]"
          >
            <div className="relative flex">
              {g.items.map((card, i) => {
                const isSel =
                  selectedGroup &&
                  selectedGroup.gid === g.id &&
                  selectedGroup.index === i;
                return (
                  <div
                    key={`${card.rank}-${card.suit}-${i}`}
                    style={{
                      marginLeft: i === 0 ? 0 : -overlap,
                      zIndex: i,
                    }}
                    onClick={() =>
                      setSelectedGroup(
                        isSel ? null : { gid: g.id, index: i }
                      )
                    }
                  >
                    <PlayingCard
                      card={card}
                      size="md"
                      selected={isSel}
                      disabled={!isMyTurn}
                    />
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-green-300 mt-1 font-semibold bg-black/40 rounded-md px-2 py-[1px]">
              {g.name}
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        {ungrouped.map((card, index) => {
          const isSelected = selected.has(index);
          return (
            <div
              key={`${card.rank}-${card.suit}-${index}`}
              style={{
                marginLeft:
                  index === 0 && groups.length === 0
                    ? 0
                    : -overlap,
                zIndex: index + 100,
              }}
              onClick={() => toggleSelect(index)}
            >
              <PlayingCard
                card={card}
                size="md"
                selected={isSelected}
                disabled={!isMyTurn}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}