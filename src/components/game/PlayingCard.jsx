import React, { useState, useRef, useEffect } from "react";

// PlayingCard Component
const PlayingCard = ({ 
  card, 
  selected = false, 
  onClick, 
  disabled = false, 
  grouped = false,
  isDragging = false,
  index,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
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

  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && onClick) {
      onClick(card);
    }
  };

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onTouchStart={(e) => onTouchStart(e, index)}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => onTouchEnd(e, index)}
      onClick={handleClick}
      className={`
        relative bg-white rounded-lg shadow-md border-2 transition-all duration-200
        w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24
        ${getSuitColor(card.suit)} 
        ${selected ? 'border-blue-500 ring-2 ring-blue-300 -translate-y-2' : 'border-gray-300'} 
        ${grouped ? 'border-green-500 ring-1 ring-green-300' : ''}
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-move hover:shadow-lg hover:-translate-y-1'}
        touch-manipulation active:scale-95
      `}
    >
      <div className="flex flex-col items-center justify-center h-full p-1">
        <div className="text-xs sm:text-sm font-bold leading-none">{card.rank}</div>
        <div className="text-base sm:text-lg leading-none mt-0.5">{getSuitSymbol(card.suit)}</div>
      </div>
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  );
};

export default PlayingCard;



// // Demo App
// const DemoApp = () => {
//   const [cards, setCards] = useState([
//     { rank: '7', suit: 'Hearts' },
//     { rank: '8', suit: 'Hearts' },
//     { rank: '9', suit: 'Hearts' },
//     { rank: 'K', suit: 'Spades' },
//     { rank: 'K', suit: 'Diamonds' },
//     { rank: 'K', suit: 'Hearts' },
//     { rank: '2', suit: 'Clubs' },
//     { rank: 'A', suit: 'Spades' },
//     { rank: '10', suit: 'Diamonds' },
//     { rank: 'J', suit: 'Diamonds' },
//     { rank: 'Q', suit: 'Diamonds' },
//     { rank: '5', suit: 'Clubs' },
//     { rank: '6', suit: 'Clubs' }
//   ]);
//   const [selectedCards, setSelectedCards] = useState([]);
//   const [isMyTurn, setIsMyTurn] = useState(true);

//   const handleCardSelect = (card) => {
//     const isSelected = selectedCards.some(
//       (selected) => selected.suit === card.suit && selected.rank === card.rank
//     );

//     if (isSelected) {
//       setSelectedCards(selectedCards.filter(
//         (selected) => !(selected.suit === card.suit && selected.rank === card.rank)
//       ));
//     } else {
//       setSelectedCards([...selectedCards, card]);
//     }
//   };

//   const handleReorder = (newOrder) => {
//     console.log('✅ Cards reordered:', newOrder.map(c => `${c.rank}${c.suit[0]}`).join(', '));
//     setCards(newOrder);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 p-2 sm:p-4">
//       <div className="max-w-6xl mx-auto">
//         {/* Control Panel */}
//         <div className="bg-white rounded-xl shadow-xl p-3 sm:p-4 mb-4">
//           <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
//             🎴 Rummy Card Game - Enhanced UI
//           </h1>
//           <div className="flex gap-2 flex-wrap">
//             <button
//               onClick={() => setIsMyTurn(!isMyTurn)}
//               className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all active:scale-95 ${
//                 isMyTurn 
//                   ? 'bg-green-500 text-white hover:bg-green-600' 
//                   : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
//               }`}
//             >
//               {isMyTurn ? '✓ Your Turn' : '⏸ Not Your Turn'}
//             </button>
//             <button
//               onClick={() => setSelectedCards([])}
//               className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
//               disabled={selectedCards.length === 0}
//             >
//               Clear ({selectedCards.length})
//             </button>
//             <button
//               onClick={() => {
//                 const newCard = { 
//                   rank: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'][Math.floor(Math.random()*13)],
//                   suit: ['Hearts','Diamonds','Clubs','Spades'][Math.floor(Math.random()*4)]
//                 };
//                 setCards([...cards, newCard]);
//               }}
//               className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:scale-95"
//             >
//               + Add Card
//             </button>
//           </div>
          
//           {/* Instructions */}
//           <div className="mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
//             <p className="text-xs sm:text-sm text-blue-800">
//               <strong>Instructions:</strong> 
//               <span className="hidden sm:inline"> Drag cards to reorder • </span>
//               <span className="sm:hidden"> Swipe cards to reorder • </span>
//               Click to select • Use sort buttons for quick organization • 
//               Find Groups to detect sequences & sets
//             </p>
//           </div>
//         </div>
        
//         {/* Game Area */}
//         <PlayerHand
//           cards={cards}
//           selectedCards={selectedCards}
//           onCardSelect={handleCardSelect}
//           isMyTurn={isMyTurn}
//           onReorder={handleReorder}
//         />

//         {/* Selected Cards Info */}
//         {selectedCards.length > 0 && (
//           <div className="mt-4 bg-white rounded-xl shadow-xl p-3 sm:p-4">
//             <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
//               Selected Cards ({selectedCards.length}):
//             </h3>
//             <div className="flex flex-wrap gap-2">
//               {selectedCards.map((card, idx) => (
//                 <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
//                   {card.rank} of {card.suit}
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>

//       <style jsx>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(-10px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.3s ease-out;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default DemoApp;