import React from 'react';
import PlayingCard from './PlayingCard';

const PlayerHand = ({ cards, selectedCards, onCardSelect, isMyTurn }) => {
  const isCardSelected = (card) => {
    return selectedCards.some(
      (selected) => selected.suit === card.suit && selected.rank === card.rank
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Cards</h3>
        <div className="text-xs sm:text-sm text-gray-600">
          {cards.length} cards | {selectedCards.length} selected
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-2 justify-center overflow-x-auto pb-2">
        {cards.map((card, index) => (
          <PlayingCard
            key={`${card.suit}-${card.rank}-${index}`}
            card={card}
            selected={isCardSelected(card)}
            onClick={onCardSelect}
            disabled={!isMyTurn}
            mobile={true}
          />
        ))}
      </div>
      
      {!isMyTurn && (
        <div className="text-center mt-3 sm:mt-4">
          <p className="text-xs sm:text-sm text-gray-500">Wait for your turn to play</p>
        </div>
      )}
    </div>
  );
};

export default PlayerHand;