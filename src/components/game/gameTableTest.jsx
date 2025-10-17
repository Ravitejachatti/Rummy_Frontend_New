import React, { useState } from "react";

/* ----------  card visual helper  ---------- */
const suitSymbol = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };
const suitColor = { Hearts: "text-red-600", Diamonds: "text-red-600", Clubs: "text-gray-900", Spades: "text-gray-900" };

const Card = ({ card, selected, onSelect }) => (
  <div
    onClick={() => onSelect(card)}
    className={`relative flex flex-col items-center justify-center rounded-md border-2 bg-white ${suitColor[card.suit]} font-bold ${
      selected ? "border-yellow-400 ring-2 ring-yellow-300 scale-110 z-20" : "border-gray-300"
    } w-12 h-16 md:w-14 md:h-20 cursor-pointer transition-transform duration-150`}
  >
    <span className="absolute top-1 left-1 text-xs">{card.rank}</span>
    <span className="text-lg md:text-xl">{suitSymbol[card.suit]}</span>
  </div>
);

/* ----------  main table ---------- */
const RANK_MAP = { A:1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,J:11,Q:12,K:13 };

const GameTableTest = () => {
  const [cards, setCards] = useState([
    { rank: "J", suit: "Spades" },
    { rank: "Q", suit: "Spades" },
    { rank: "K", suit: "Spades" },
    { rank: "A", suit: "Diamonds" },
    { rank: "Q", suit: "Diamonds" },
    { rank: "4", suit: "Clubs" },
    { rank: "5", suit: "Clubs" },
    { rank: "9", suit: "Clubs" },
  ]);
  const [selected, setSelected] = useState([]);
  const [groups, setGroups] = useState([]);

  const toggleSelect = (card) => {
    setSelected((prev) => {
      const exists = prev.find((c) => c.rank === card.rank && c.suit === card.suit);
      return exists ? prev.filter((c) => !(c.rank === card.rank && c.suit === card.suit)) : [...prev, card];
    });
  };

  /* simple pure-sequence detection for demo */
  const handleGroup = () => {
    if (selected.length < 3) return;
    setGroups([...groups, { type: "Group", cards: selected }]);
    setCards(cards.filter((c) => !selected.find((s) => s.rank === c.rank && s.suit === c.suit)));
    setSelected([]);
  };

  const ungroup = (gIndex) => {
    const g = groups[gIndex];
    setCards([...cards, ...g.cards]);
    setGroups(groups.filter((_, i) => i !== gIndex));
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      {/* fixed 16:9 horizontal frame */}
      <div className="relative aspect-[16/9] w-[820px] max-w-[95vw] rounded-[20px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] border-[10px] border-yellow-700/60 ring-4 ring-yellow-500/30 bg-gradient-to-br from-green-700 via-emerald-800 to-green-900">
        {/* inner oval table */}
        <div className="absolute inset-[12%] bg-gradient-to-b from-green-600 to-green-800 rounded-[50%] shadow-inner border-4 border-green-900" />

        {/* opponent avatar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-600 border-2 border-white flex items-center justify-center text-xl font-bold shadow-lg">
            B
          </div>
          <span className="text-xs text-white mt-1">Bob</span>
        </div>

        {/* draw + discard piles */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4">
          <div className="w-14 h-20 bg-green-950 border-4 border-yellow-600 rounded-md flex items-center justify-center text-white shadow-lg cursor-pointer">
            🂠
          </div>
          <div className="w-14 h-20 bg-green-800 border-4 border-yellow-600 rounded-md flex items-center justify-center text-white shadow-lg cursor-pointer">
            <span className="text-lg">8♠</span>
          </div>
        </div>

        {/* bottom hand area */}
        <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gradient-to-t from-green-900/60 to-transparent flex flex-col items-center justify-end pb-2">
          {/* grouped boxes */}
          <div className="flex gap-3 mb-2 overflow-x-auto px-4">
            {groups.map((g, i) => (
              <div key={i} className="bg-black/40 rounded-lg border border-yellow-500 px-2 py-1 flex flex-col items-center">
                <span className="text-[10px] text-yellow-300 font-bold mb-1">{g.type}</span>
                <div className="flex gap-1">
                  {g.cards.map((c, j) => (
                    <Card key={j} card={c} onSelect={() => {}} />
                  ))}
                </div>
                <button onClick={() => ungroup(i)} className="text-[9px] text-red-300 mt-1 underline">Ungroup</button>
              </div>
            ))}
          </div>

          {/* player cards row */}
          <div className="flex justify-center flex-wrap gap-1 px-2">
            {cards.map((card, i) => (
              <Card key={i} card={card} selected={selected.some(s=>s.rank===card.rank && s.suit===card.suit)} onSelect={toggleSelect}/>
            ))}
          </div>

          {/* action buttons */}
          <div className="flex gap-4 mt-2">
            <button onClick={handleGroup} className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg shadow-md hover:brightness-110 active:scale-95">
              Group Selected
            </button>
            <button onClick={()=>setGroups([])} className="bg-gradient-to-r from-gray-700 to-gray-800 text-white text-sm font-bold px-4 py-1.5 rounded-lg shadow-md hover:brightness-110 active:scale-95">
              Reset
            </button>
          </div>
        </div>

        {/* turn badge */}
        <div className="absolute top-3 right-3 bg-black/50 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full shadow-md">
          🟢 Your Turn
        </div>
      </div>
    </div>
  );
};

export default GameTableTest;