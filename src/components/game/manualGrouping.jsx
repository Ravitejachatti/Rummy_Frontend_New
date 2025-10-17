import React, { useState, useRef } from "react";

export default function SimpleHand({ cards }) {
  const [hand, setHand] = useState(cards);
  const [dragging, setDragging] = useState(null);
  const containerRef = useRef(null);

  const handleMouseDown = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging({
      index,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      x: rect.left,
      y: rect.top,
      card: hand[index],
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setDragging((d) => ({ ...d, x: e.clientX - d.offsetX, y: e.clientY - d.offsetY }));
  };

  const handleMouseUp = (e) => {
    if (!dragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;

    // Find drop index
    const cardWidth = 60;
    const newIndex = Math.min(
      hand.length - 1,
      Math.max(0, Math.floor(relX / cardWidth))
    );

    const updated = [...hand];
    const [moved] = updated.splice(dragging.index, 1);
    updated.splice(newIndex, 0, moved);
    setHand(updated);
    setDragging(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-end justify-center w-full h-40 bg-green-700 rounded-lg p-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {hand.map((card, i) => {
        const isDragging = dragging && dragging.index === i;
        return (
          <div
            key={i}
            onMouseDown={(e) => handleMouseDown(e, i)}
            className="absolute cursor-pointer transition-all duration-150"
            style={{
              left: `${i * 60}px`,
              top: isDragging ? dragging.y - containerRef.current?.getBoundingClientRect().top : "0px",
              zIndex: isDragging ? 1000 : i,
              transform: isDragging ? "scale(1.05)" : "none",
            }}
          >
            <div className="w-14 h-20 bg-white rounded-md flex flex-col items-center justify-center shadow-md border text-lg">
              <span>{card.rank}</span>
              <span>{card.suit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
