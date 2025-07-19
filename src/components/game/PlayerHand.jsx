import React from 'react';
import PlayingCard from './PlayingCard';

const PlayerHand = ({ cards, selectedCards, onCardSelect, isMyTurn }) => {
  const isCardSelected = (card) => {
    return selectedCards.some(
      (selected) => selected.suit === card.suit && selected.rank === card.rank
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Cards</h3>
        <div className="text-sm text-gray-600">
          {cards.length} cards | {selectedCards.length} selected
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center">
        {cards.map((card, index) => (
          <PlayingCard
            key={`${card.suit}-${card.rank}-${index}`}
            card={card}
            selected={isCardSelected(card)}
            onClick={onCardSelect}
            disabled={!isMyTurn}
          />
        ))}
      </div>
      
      {!isMyTurn && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">Wait for your turn to play</p>
        </div>
      )}
    </div>
  );
};

export default PlayerHand;