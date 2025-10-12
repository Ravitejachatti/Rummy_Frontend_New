// client/src/components/game/PlayerHand.jsx
import React, {useState, useRef} from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import PlayingCard from "./PlayingCard";
import socketService from "../../config/socket";

// Main PlayerHand Component
const PlayerHand = ({
  cards = [],
  selectedCards = [],
  onCardSelect,
  isMyTurn = false,
  onReorder,
}) => { 
  const [groups, setGroups] = useState([]);
  const [showGrouping, setShowGrouping] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [touchStartIndex, setTouchStartIndex] = useState(null);
  const [touchCurrentIndex, setTouchCurrentIndex] = useState(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const draggedElement = useRef(null);

  // Check if card is selected
  const isCardSelected = (card) =>
    selectedCards.some(
      (selected) => selected.suit === card.suit && selected.rank === card.rank
    );

  // Auto-detect potential groups
  const detectGroups = () => {
    if (cards.length === 0) return [];
    
    const detectedGroups = [];
    const used = new Set();

    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // Detect sequences
    suits.forEach(suit => {
      const suitCards = cards
        .map((card, idx) => ({ ...card, originalIndex: idx }))
        .filter(card => card.suit === suit && !used.has(`${card.rank}-${card.suit}`))
        .sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

      for (let i = 0; i < suitCards.length - 2; i++) {
        const sequence = [suitCards[i]];
        for (let j = i + 1; j < suitCards.length; j++) {
          const lastCard = sequence[sequence.length - 1];
          const currentCard = suitCards[j];
          if (rankOrder.indexOf(currentCard.rank) === rankOrder.indexOf(lastCard.rank) + 1) {
            sequence.push(currentCard);
          }
        }
        
        if (sequence.length >= 3) {
          detectedGroups.push({
            type: 'sequence',
            cards: sequence,
            suit: suit
          });
          sequence.forEach(card => used.add(`${card.rank}-${card.suit}`));
        }
      }
    });

    // Detect sets
    const rankGroups = {};
    cards.forEach((card, idx) => {
      if (!used.has(`${card.rank}-${card.suit}`)) {
        if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
        rankGroups[card.rank].push({ ...card, originalIndex: idx });
      }
    });

    Object.entries(rankGroups).forEach(([rank, rankCards]) => {
      if (rankCards.length >= 3) {
        detectedGroups.push({
          type: 'set',
          cards: rankCards,
          rank: rank
        });
        rankCards.forEach(card => used.add(`${card.rank}-${card.suit}`));
      }
    });

    return detectedGroups;
  };

  // Drag handlers for desktop
  const handleDragStart = (e, index) => {
    if (!isMyTurn) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === dropIndex || !isMyTurn) return;

    const reordered = Array.from(cards);
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);

    onReorder(reordered);
    setDraggedIndex(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e, index) => {
    if (!isMyTurn) return;
    
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setTouchStartIndex(index);
    setTouchCurrentIndex(index);
    
    // Create ghost element
    const target = e.currentTarget;
    const clone = target.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '1000';
    clone.style.opacity = '0.8';
    clone.style.left = `${touch.clientX - target.offsetWidth / 2}px`;
    clone.style.top = `${touch.clientY - target.offsetHeight / 2}px`;
    clone.id = 'drag-ghost';
    document.body.appendChild(clone);
    draggedElement.current = clone;
  };

  const handleTouchMove = (e) => {
    if (touchStartIndex === null || !draggedElement.current) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Move ghost element
    const ghost = draggedElement.current;
    ghost.style.left = `${touch.clientX - ghost.offsetWidth / 2}px`;
    ghost.style.top = `${touch.clientY - ghost.offsetHeight / 2}px`;

    // Detect drop position
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const cardElement = elements.find(el => el.classList.contains('card-drop-zone'));
    if (cardElement) {
      const index = parseInt(cardElement.dataset.index);
      if (!isNaN(index)) {
        setTouchCurrentIndex(index);
      }
    }
  };

  const handleTouchEnd = (e, endIndex) => {
    if (touchStartIndex === null) return;

    // Remove ghost element
    if (draggedElement.current) {
      draggedElement.current.remove();
      draggedElement.current = null;
    }

    const dropIndex = touchCurrentIndex !== null ? touchCurrentIndex : endIndex;

    if (touchStartIndex !== dropIndex && isMyTurn) {
      const reordered = Array.from(cards);
      const [removed] = reordered.splice(touchStartIndex, 1);
      reordered.splice(dropIndex, 0, removed);
      onReorder(reordered);
    }

    setTouchStartIndex(null);
    setTouchCurrentIndex(null);
  };

  // Sort cards
  const sortCards = (method) => {
    let sorted = [...cards];
    
    if (method === 'suit') {
      const suitOrder = { 'Spades': 0, 'Hearts': 1, 'Diamonds': 2, 'Clubs': 3 };
      const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      sorted.sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      });
    } else if (method === 'rank') {
      const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      sorted.sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
    } else if (method === 'group') {
      const detectedGroups = detectGroups();
      const grouped = new Set();
      sorted = [];
      
      detectedGroups.forEach(group => {
        group.cards.forEach(card => {
          sorted.push(card);
          grouped.add(`${card.rank}-${card.suit}`);
        });
      });
      
      cards.forEach(card => {
        if (!grouped.has(`${card.rank}-${card.suit}`)) {
          sorted.push(card);
        }
      });
    }
    
    onReorder(sorted);
  };

  // Toggle grouping
  const toggleGrouping = () => {
    const newShowGrouping = !showGrouping;
    setShowGrouping(newShowGrouping);
    
    if (newShowGrouping) {
      const detected = detectGroups();
      setGroups(detected);
      if (detected.length > 0) {
        sortCards('group');
      }
    } else {
      setGroups([]);
    }
  };

  // Check if card is in a group
  const isCardInGroup = (card) => {
    if (!showGrouping) return false;
    return groups.some(group => 
      group.cards.some(c => c.rank === card.rank && c.suit === card.suit)
    );
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-2xl p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🃏</span> Your Hand
          </h3>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">
            {cards.length} cards | {selectedCards.length} selected
            {showGrouping && groups.length > 0 && ` | ${groups.length} groups`}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sortCards('suit')}
            className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-50"
            disabled={!isMyTurn}
          >
            ♠ Suit
          </button>
          <button
            onClick={() => sortCards('rank')}
            className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-50"
            disabled={!isMyTurn}
          >
            # Rank
          </button>
          <button
            onClick={toggleGrouping}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 ${
              showGrouping 
                ? 'bg-green-500 hover:bg-green-600 text-white ring-2 ring-green-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            disabled={!isMyTurn}
          >
            {showGrouping ? '✓ Groups' : '📊 Groups'}
          </button>
        </div>
      </div>

      {/* Groups Info */}
      {showGrouping && groups.length > 0 && (
        <div className="mb-3 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
          <div className="text-xs sm:text-sm font-semibold text-green-800 mb-2">
            ✨ Detected Groups:
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((group, idx) => (
              <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                {group.type === 'sequence' 
                  ? `${group.cards.length}-card ${group.suit} sequence` 
                  : `${group.cards.length} ${group.rank}s`}
              </span>
            ))}
          </div>
        </div>
      )}

      {showGrouping && groups.length === 0 && (
        <div className="mb-3 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs sm:text-sm text-yellow-800">
            ℹ️ No valid groups found. You need at least 3 consecutive cards (sequence) or 3 cards of same rank (set).
          </p>
        </div>
      )}

      {/* Cards Display */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center min-h-[80px] sm:min-h-[100px] p-2 sm:p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
          {cards.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm sm:text-base">🎴 No cards yet</p>
            </div>
          ) : (
            cards.map((card, index) => (
              <div
                key={`${card.rank}-${card.suit}-${index}`}
                className="card-drop-zone"
                data-index={index}
              >
                <PlayingCard
                  card={card}
                  selected={isCardSelected(card)}
                  onClick={onCardSelect}
                  disabled={!isMyTurn}
                  grouped={isCardInGroup(card)}
                  isDragging={draggedIndex === index || touchStartIndex === index}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status Message */}
      {!isMyTurn && (
        <div className="text-center mt-3 sm:mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs sm:text-sm text-yellow-800 font-medium">
            ⏳ Wait for your turn to play
          </p>
        </div>
      )}

      {/* Help Text */}
      {isMyTurn && (
        <div className="text-center mt-3 text-xs text-gray-500">
          💡 Tap to select • Drag/swipe to reorder • Use buttons to auto-sort
        </div>
      )}
    </div>
  );
};

export default PlayerHand;