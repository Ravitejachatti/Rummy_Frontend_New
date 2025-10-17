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
import PlayingCard from "./PlayingCard";

// ---------- SortableCard ----------
function SortableCard({ card, id, onClick, selected, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: -18,
    zIndex: 999,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PlayingCard
        card={card}
        size="sm"
        selected={selected}
        disabled={disabled}
        onClick={onClick}
      />
    </div>
  );
}

// ---------- PlayerHand ----------
export default function PlayerHand({ cards = [], isMyTurn = false, onDiscard }) {
  const [ungrouped, setUngrouped] = useState(cards);
  const [groups, setGroups] = useState([]); // [{id,name,items:[]}]
  const [selected, setSelected] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => setUngrouped(cards), [cards]);

  const sensors = useSensors(useSensor(PointerSensor));

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
    setGroups((g) => [
      ...g,
      { id: Date.now().toString(), name: type, items: chosen },
    ]);
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

  // ---------- Drag & Drop ----------
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const [fromType, fromId, fromIndex] = active.id.split(":");
    const [toType, toId, toIndex] = over.id.split(":");

    if (fromType === "ungrouped" && toType === "ungrouped") {
      // reorder ungrouped
      const oldIndex = parseInt(fromId);
      const newIndex = parseInt(toId);
      setUngrouped((items) => arrayMove(items, oldIndex, newIndex));
    } else if (fromType === "group" && toType === "group" && fromId === toId) {
      // reorder within same group
      const gid = fromId;
      const oldIndex = parseInt(fromIndex);
      const newIndex = parseInt(toIndex);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === gid ? { ...g, items: arrayMove(g.items, oldIndex, newIndex) } : g
        )
      );
    } else {
      // move between areas
      moveCardBetween(fromType, fromId, fromIndex, toType, toId, toIndex);
    }
  };

  const moveCardBetween = (
    fromType,
    fromId,
    fromIndex,
    toType,
    toId,
    toIndex
  ) => {
    setGroups((prevGroups) => {
      const newGroups = structuredClone(prevGroups);
      let movingCard;

      if (fromType === "ungrouped") {
        movingCard = ungrouped[parseInt(fromId)];
        setUngrouped((u) => u.filter((_, i) => i !== parseInt(fromId)));
      } else {
        const gIdx = newGroups.findIndex((g) => g.id === fromId);
        movingCard = newGroups[gIdx].items.splice(parseInt(fromIndex), 1)[0];
      }

      if (toType === "ungrouped") {
        setUngrouped((u) => {
          const arr = [...u];
          arr.splice(parseInt(toId), 0, movingCard);
          return arr;
        });
      } else {
        const gIdx = newGroups.findIndex((g) => g.id === toId);
        if (gIdx !== -1) {
          if (!newGroups[gIdx].items) newGroups[gIdx].items = [];
          newGroups[gIdx].items.splice(parseInt(toIndex) || 0, 0, movingCard);
        }
      }

      return newGroups;
    });
  };

  const totalCards =
    ungrouped.length + groups.reduce((a, g) => a + g.items.length, 0);

  // ---------- UI ----------
  return (
    <div className="w-full h-full flex flex-col justify-end p-2 select-none">
      {/* Top Controls */}
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

      {/* Card Area */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex justify-center items-end flex-nowrap overflow-hidden">
          {/* Groups */}
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col items-center mr-8">
              <SortableContext
                items={g.items.map((_, i) => `group:${g.id}:${i}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="relative flex items-end">
                  {g.items.map((card, i) => (
                    <SortableCard
                      key={`group:${g.id}:${i}`}
                      id={`group:${g.id}:${i}`}
                      card={card}
                      selected={
                        selectedGroup &&
                        selectedGroup.gid === g.id &&
                        selectedGroup.index === i
                      }
                      disabled={!isMyTurn}
                      onClick={() =>
                        setSelectedGroup(
                          selectedGroup &&
                            selectedGroup.gid === g.id &&
                            selectedGroup.index === i
                            ? null
                            : { gid: g.id, index: i }
                        )
                      }
                    />
                  ))}
                </div>
              </SortableContext>
              <div className="text-[10px] text-white bg-green-600 rounded-b-md font-semibold mt-0.5 px-3 py-[2px]">
                {g.name}
              </div>
            </div>
          ))}

          {/* Ungrouped */}
          <div className="flex flex-col items-center">
            <SortableContext
              items={ungrouped.map((_, i) => `ungrouped:${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="relative flex items-end">
                {ungrouped.map((card, i) => (
                  <SortableCard
                    key={`ungrouped:${i}`}
                    id={`ungrouped:${i}`}
                    card={card}
                    selected={selected.has(i)}
                    disabled={!isMyTurn}
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