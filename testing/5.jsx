// client/src/components/game/PlayerHand.jsx
import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// ---------- SortableCard ----------
function SortableCard({ card, id, onClick, selected }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: -18,
    zIndex: isDragging ? 1000 : 999,
    opacity: isDragging ? 0.5 : 1,
  };

  const [clickStartPos, setClickStartPos] = useState(null);

  const handlePointerDown = (e) => {
    setClickStartPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e) => {
    if (!clickStartPos) return;
    const dx = Math.abs(e.clientX - clickStartPos.x);
    const dy = Math.abs(e.clientY - clickStartPos.y);
    if (dx < 5 && dy < 5 && !isDragging) onClick?.(e);
    setClickStartPos(null);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <PlayingCard card={card} size="sm" selected={selected} />
    </div>
  );
}

// ---------- PlayerHand ----------
export default function PlayerHand({ cards = [], isMyTurn = false, onDiscard }) {
  const [ungrouped, setUngrouped] = useState(cards);
  const [groups, setGroups] = useState([]); // [{id,name,items:[]}]
  const [selected, setSelected] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    setUngrouped(cards);
    setSelected(new Set());
  }, [cards]);

  // Configure sensors
  const sensors = useSensors(useSensor(PointerSensor));

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

  // ---------- DnD ----------

  // ---------- DnD ----------
const handleDragStart = (event) => {
  console.log("🟢 Drag started:", event.active.id);
};

const handleDragOver = (event) => {
  console.log("🟡 Drag over:", event.over?.id || "(none)");
};

const handleDragEnd = (event) => {
  const { active, over } = event;
  console.log("🔵 Drag end:", {
    active: active?.id,
    over: over?.id,
  });

  if (!over) {
    console.log("❌ No drop target detected");
    return;
  }

  const [fromType, fromGroupId, fromCard] = active.id.split(":");
  const [toType, toGroupId, toCard] = over.id.split(":");

  console.log(`➡️ Move from ${fromType}${fromGroupId ? `(${fromGroupId})` : ""} → ${toType}${toGroupId ? `(${toGroupId})` : ""}`);

  if (fromType === "ungrouped" && toType === "ungrouped") {
    console.log("↔️ Reordering within ungrouped");
    const oldIndex = ungrouped.findIndex((c, i) =>
      active.id.includes(`${c.rank}-${c.suit}-${i}`)
    );
    const newIndex = ungrouped.findIndex((c, i) =>
      over.id.includes(`${c.rank}-${c.suit}-${i}`)
    );
    console.log("Indices:", { oldIndex, newIndex });
    setUngrouped((items) => arrayMove(items, oldIndex, newIndex));
  } else if (fromType === "group" && toType === "group" && fromGroupId === toGroupId) {
    console.log("↔️ Reordering within same group", fromGroupId);
    setGroups((prev) =>
      prev.map((g) =>
        g.id === fromGroupId
          ? {
              ...g,
              items: (() => {
                const oldIndex = g.items.findIndex((c, i) =>
                  active.id.includes(`${c.rank}-${c.suit}-${i}`)
                );
                const newIndex = g.items.findIndex((c, i) =>
                  over.id.includes(`${c.rank}-${c.suit}-${i}`)
                );
                console.log("Group reorder indices:", { oldIndex, newIndex });
                return arrayMove(g.items, oldIndex, newIndex);
              })(),
            }
          : g
      )
    );
  } else {
    console.log("🔄 Moving between zones:", { fromType, toType });
    moveCardBetweenZones(active.id, over.id);
  }
};

  // const handleDragEnd = (event) => {
  //   const { active, over } = event;
  //   if (!over) return;

  //   const [fromType, fromGroupId, fromCard] = active.id.split(":");
  //   const [toType, toGroupId, toCard] = over.id.split(":");

  //   if (fromType === "ungrouped" && toType === "ungrouped") {
  //     // Reorder within ungrouped
  //     const oldIndex = ungrouped.findIndex((c, i) =>
  //       active.id.includes(`${c.rank}-${c.suit}-${i}`)
  //     );
  //     const newIndex = ungrouped.findIndex((c, i) =>
  //       over.id.includes(`${c.rank}-${c.suit}-${i}`)
  //     );
  //     setUngrouped((items) => arrayMove(items, oldIndex, newIndex));
  //   } else if (fromType === "group" && toType === "group" && fromGroupId === toGroupId) {
  //     // Reorder within the same group
  //     setGroups((prev) =>
  //       prev.map((g) =>
  //         g.id === fromGroupId
  //           ? {
  //               ...g,
  //               items: (() => {
  //                 const oldIndex = g.items.findIndex((c, i) =>
  //                   active.id.includes(`${c.rank}-${c.suit}-${i}`)
  //                 );
  //                 const newIndex = g.items.findIndex((c, i) =>
  //                   over.id.includes(`${c.rank}-${c.suit}-${i}`)
  //                 );
  //                 return arrayMove(g.items, oldIndex, newIndex);
  //               })(),
  //             }
  //           : g
  //       )
  //     );
  //   } else {
  //     // Move between ungrouped <-> group
  //     moveCardBetweenZones(active.id, over.id);
  //   }
  // };


  const reorderCardsByIds = (cards, activeId, overId) => {
    const oldIndex = cards.findIndex((c, i) =>
      activeId.includes(`${c.rank}-${c.suit}-${i}`)
    );
    const newIndex = cards.findIndex((c, i) =>
      overId.includes(`${c.rank}-${c.suit}-${i}`)
    );
    return arrayMove(cards, oldIndex, newIndex);
  };

  const moveCardBetweenZones = (activeId, overId) => {
    let movingCard = null;
    const [fromType, fromGroupId] = activeId.split(":");
    const [toType, toGroupId] = overId.split(":");

    if (fromType === "ungrouped") {
      const idx = ungrouped.findIndex((c, i) =>
        activeId.includes(`${c.rank}-${c.suit}-${i}`)
      );
      movingCard = ungrouped[idx];
      setUngrouped((u) => u.filter((_, i) => i !== idx));
    } else {
      setGroups((prev) => {
        const newGroups = [...prev];
        const gIdx = newGroups.findIndex((g) => g.id === fromGroupId);
        if (gIdx >= 0) {
          const idx = newGroups[gIdx].items.findIndex((c, i) =>
            activeId.includes(`${c.rank}-${c.suit}-${i}`)
          );
          movingCard = newGroups[gIdx].items.splice(idx, 1)[0];
        }
        return newGroups;
      });
    }

    if (!movingCard) return;

    if (toType === "ungrouped") {
      setUngrouped((u) => [...u, movingCard]);
    } else {
      setGroups((prev) => {
        const newGroups = [...prev];
        const gIdx = newGroups.findIndex((g) => g.id === toGroupId);
        if (gIdx >= 0) newGroups[gIdx].items.push(movingCard);
        return newGroups;
      });
    }
  };

  const totalCards =
    ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0);

  // ---------- UI ----------
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

      {/* DnD Container */}
   <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
      <div className="flex justify-center items-end flex-nowrap overflow-x-auto pb-2">
        {/* Groups */}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col items-center mr-8 flex-shrink-0">
            <SortableContext
              id={`group-${g.id}`}
              items={g.items.map((card, i) => `group:${g.id}:${card.rank}-${card.suit}-${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="relative flex items-end">
                {g.items.map((card, i) => (
                  <SortableCard
                    key={`group:${g.id}:${card.rank}-${card.suit}-${i}`}
                    id={`group:${g.id}:${card.rank}-${card.suit}-${i}`}
                    card={card}
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
                ))}
              </div>
            </SortableContext>

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
          <SortableContext
            id="ungrouped-zone"
            items={ungrouped.map(
              (card, i) => `ungrouped:${card.rank}-${card.suit}-${i}`
            )}
            strategy={horizontalListSortingStrategy}
          >
            <div className="relative flex items-end">
              {ungrouped.map((card, i) => (
                <SortableCard
                  key={`ungrouped:${card.rank}-${card.suit}-${i}`}
                  id={`ungrouped:${card.rank}-${card.suit}-${i}`}
                  card={card}
                  selected={selected.has(i)}
                  onClick={() => toggleSelect(i)}
                />
              ))}
            </div>
          </SortableContext>
          {ungrouped.length > 0 && (
            <div className="text-[10px] text-white bg-gray-700 rounded-b-md font-semibold mt-0.5 px-3 py-[2px]">
              Ungrouped
            </div>
          )}
        </div>
      </div>
    </DndContext>

    </div>
  );
}