export default function PlayingCard({
  card,
  selected = false,
  disabled = false,
  isDragging = false,
  ghost = false,
}) {
  if (!card) return null;
  const color =
    card.suit === "Hearts" || card.suit === "Diamonds"
      ? "text-red-600"
      : "text-gray-900";

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md border transition-all duration-150 select-none
      w-14 h-20 sm:w-14 sm:h-20
      ${color}
      ${isDragging ? "scale-110 z-50 shadow-2xl" : ""}
      ${selected ? "ring-2 ring-amber-400 border-amber-400" : ""}
      ${disabled ? "opacity-70" : "hover:-translate-y-0.5"}
      ${ghost ? "opacity-90" : ""}`}
    >
      <div className="absolute inset-0 p-1 flex flex-col justify-between">
        <div className="text-xs font-semibold leading-none">
          {card.rank}
          {card.suit === "Hearts"
            ? "♥"
            : card.suit === "Diamonds"
            ? "♦"
            : card.suit === "Clubs"
            ? "♣"
            : "♠"}
        </div>
        <div className="text-lg sm:text-xl text-center">
          {card.suit === "Hearts"
            ? "♥"
            : card.suit === "Diamonds"
            ? "♦"
            : card.suit === "Clubs"
            ? "♣"
            : "♠"}
        </div>
        <div className="text-xs self-end rotate-180 font-semibold">
          {card.rank}
          {card.suit === "Hearts"
            ? "♥"
            : card.suit === "Diamonds"
            ? "♦"
            : card.suit === "Clubs"
            ? "♣"
            : "♠"}
        </div>
      </div>
    </div>
  );
}


import React, { useState, useRef, useEffect } from "react";
import PlayingCard from "./PlayingCard";

export default function PlayerHand({
  cards = [],
  isMyTurn = false,
  onReorder,
  onCardSelect,
  onDiscard,
}) {
  const [cardOrder, setCardOrder] = useState(cards);
  const [dragging, setDragging] = useState(null); // {index,startX,offsetX}
  const [hoverIndex, setHoverIndex] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const containerRef = useRef(null);

  const cardWidth = 56;
  const gap = 6;

  useEffect(() => {
    setCardOrder(cards);
  }, [cards]);

  // ---------- Drag logic ----------
  const handleDragStart = (index, clientX) => {
    if (!isMyTurn) return;
    setDragging({ index, startX: clientX, offsetX: 0 });
  };

  const handleDragMove = (clientX) => {
    if (!dragging) return;
    const offsetX = clientX - dragging.startX;
    setDragging((d) => ({ ...d, offsetX }));

    const totalWidth = cardWidth + gap;
    const movedSlots = Math.round(offsetX / totalWidth);
    const newIndex = Math.min(
      Math.max(dragging.index + movedSlots, 0),
      cardOrder.length - 1
    );
    setHoverIndex(newIndex);
  };

  const handleDragEnd = () => {
    if (!dragging) return;
    const { index } = dragging;
    if (hoverIndex != null && hoverIndex !== index) {
      const updated = [...cardOrder];
      const [moved] = updated.splice(index, 1);
      updated.splice(hoverIndex, 0, moved);
      setCardOrder(updated);
      onReorder?.(updated);
    }
    setDragging(null);
    setHoverIndex(null);
  };

  useEffect(() => {
    const handleMove = (e) =>
      handleDragMove(e.touches ? e.touches[0].clientX : e.clientX);
    const handleEnd = () => handleDragEnd();

    if (dragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, hoverIndex]);

  // ---------- Selection & actions ----------
  const toggleSelect = (index) => {
    if (!isMyTurn || dragging) return;
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(index) ? copy.delete(index) : copy.add(index);
      const card = cardOrder[index];
      onCardSelect?.(card);
      return copy;
    });
  };

  const handleGroupSelected = () => {
    if (selected.size === 0) return;
    const type = prompt("Enter group type: Pure / Impure / Set", "Pure");
    if (!type) return;
    const grouped = Array.from(selected).map((i) => cardOrder[i]);
    alert(`Grouped ${grouped.length} cards as ${type}`);
    setSelected(new Set());
  };

  const handleDiscardSelected = () => {
    if (selected.size !== 1) return;
    const index = Array.from(selected)[0];
    const card = cardOrder[index];
    onDiscard?.(card);
    setSelected(new Set());
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col justify-between px-3 pb-2 select-none"
    >
      {/* ---------- Top control bar ---------- */}
      <div className="flex items-center justify-between text-xs text-white/70 mb-1">
        <div>
          {cardOrder.length} cards • {selected.size} selected
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGroupSelected}
            disabled={!isMyTurn || selected.size === 0}
            className="px-3 py-1 bg-amber-500 rounded-full text-black text-xs font-semibold disabled:opacity-40"
          >
            Group Selected
          </button>
          <button
            onClick={handleDiscardSelected}
            disabled={!isMyTurn || selected.size !== 1}
            className="px-3 py-1 bg-blue-500 rounded-full text-white text-xs font-semibold disabled:opacity-40"
          >
            Discard Selected
          </button>
        </div>
      </div>

      {/* ---------- Hand cards ---------- */}
      <div className="relative flex items-end justify-center w-full overflow-x-auto pb-1">
        {cardOrder.map((card, index) => {
          const isDragging = dragging && dragging.index === index;
          const translateX =
            isDragging && dragging.offsetX
              ? `translateX(${dragging.offsetX}px) translateY(-20px)`
              : "translateX(0)";
          const transition = isDragging
            ? "none"
            : "transform 0.15s ease, box-shadow 0.15s ease";

          const adjust =
            hoverIndex != null &&
            dragging &&
            index === hoverIndex &&
            hoverIndex !== dragging.index
              ? dragging.index < hoverIndex
                ? -20
                : 20
              : 0;

          const isSelected = selected.has(index);

          return (
            <div
              key={`${card.rank}-${card.suit}-${index}`}
              style={{
                transform: `${translateX} translateX(${adjust}px)`,
                transition,
                zIndex: isDragging ? 50 : isSelected ? 10 : 1,
                marginLeft: index === 0 ? 0 : 6,
              }}
              onMouseDown={(e) => handleDragStart(index, e.clientX)}
              onTouchStart={(e) => handleDragStart(index, e.touches[0].clientX)}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelect(index);
              }}
            >
              <PlayingCard
                card={card}
                isDragging={isDragging}
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

