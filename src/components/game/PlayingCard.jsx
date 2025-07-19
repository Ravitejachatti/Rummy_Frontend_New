import React from 'react';

const PlayingCard = ({ card, selected = false, onClick, disabled = false }) => {
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'Hearts': return '♥';
      case 'Diamonds': return '♦';
      case 'Clubs': return '♣';
      case 'Spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit) => {
    return suit === 'Hearts' || suit === 'Diamonds' ? 'text-red-600' : 'text-gray-900';
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(card);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`playing-card ${getSuitColor(card.suit)} ${
        selected ? 'selected' : ''
      } ${
        disabled ? 'cursor-not-allowed opacity-50' : onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-lg font-bold">{card.rank}</div>
        <div className="text-xl">{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  );
};

export default PlayingCard;