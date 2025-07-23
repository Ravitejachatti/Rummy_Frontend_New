import React from 'react';

const PlayingCard = ({ card, selected = false, onClick, disabled = false, mobile = false }) => {
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

  const cardSize = mobile ? 'w-10 h-14 sm:w-12 sm:h-16' : 'w-12 h-16 sm:w-16 sm:h-24';
  const textSize = mobile ? 'text-xs' : 'text-sm sm:text-base';
  const symbolSize = mobile ? 'text-sm' : 'text-lg sm:text-xl';

  return (
    <div
      onClick={handleClick}
      className={`playing-card ${cardSize} ${getSuitColor(card.suit)} ${
        selected ? 'selected' : ''
      } ${
        disabled ? 'cursor-not-allowed opacity-50' : onClick ? 'cursor-pointer' : ''
      } ${mobile ? 'touch-manipulation' : ''}`}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className={`${textSize} font-bold`}>{card.rank}</div>
        <div className={symbolSize}>{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  );
};

export default PlayingCard;