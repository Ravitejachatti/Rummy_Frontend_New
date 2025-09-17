// client/src/components/game/PlayerHand.jsx
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import PlayingCard from "./PlayingCard";
import socketService from "../../config/socket";

const PlayerHand = ({
  cards,
  selectedCards,
  onCardSelect,
  isMyTurn,
  gameId,
  userId,
  onReorder, // Redux updater passed from GameTable
}) => {
  const isCardSelected = (card) =>
    selectedCards.some(
      (selected) => selected.suit === card.suit && selected.rank === card.rank
    );

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(cards);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // 1️⃣ Optimistic update in Redux
    onReorder(reordered);

    // 2️⃣ Send to backend
    const socket = socketService.getSocket();
    socket?.emit("rummy/update_order", {
      gameId,
      playerId: userId,
      newOrder: reordered,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Cards</h3>
        <div className="text-xs sm:text-sm text-gray-600">
          {cards.length} cards | {selectedCards.length} selected
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="player-hand" direction="horizontal">
          {(provided) => (
            <div
              className="flex flex-wrap gap-1 sm:gap-2 justify-center overflow-x-auto pb-2"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {cards.map((card, index) => (
                <Draggable
                  key={`${card.suit}-${card.rank}-${index}`}
                  draggableId={`${card.suit}-${card.rank}-${index}`}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <PlayingCard
                        card={card}
                        selected={isCardSelected(card)}
                        onClick={onCardSelect}
                        disabled={!isMyTurn}
                        mobile={true}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!isMyTurn && (
        <div className="text-center mt-3 sm:mt-4">
          <p className="text-xs sm:text-sm text-gray-500">Wait for your turn to play</p>
        </div>
      )}
    </div>
  );
};

export default PlayerHand;