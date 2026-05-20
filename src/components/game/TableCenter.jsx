import React, { useState } from "react";
import { getCardImage } from "../utils/cardimages";

function suitGlyph(suit) {
  const map = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠", Joker: "★" };
  return map[suit] || "";
}

function CardFace({ card, className = "" }) {
  const img = card ? getCardImage(card) : null;
  if (!card) return <div className={`rummy-empty-card ${className}`}>OPEN</div>;
  return (
    <div className={`rummy-open-card ${className}`}>
      {img ? (
        <img src={img} alt={`${card.rank} of ${card.suit}`} draggable={false} />
      ) : (
        <div className={`manual-card ${card.suit === "Hearts" || card.suit === "Diamonds" ? "red" : "black"}`}>
          <span>{card.rank}</span>
          <strong>{suitGlyph(card.suit)}</strong>
        </div>
      )}
    </div>
  );
}

export default function TableCenter({
  drawPileCount = 0,
  discardTop,
  discardHistory = [],
  isMyTurn = false,
  canDrawFromDeck = false,
  canDrawFromDiscard = false,
  canDiscard = false,
  showDiscardHistory = false,
  onDrawFromDeck,
  onDrawFromDiscard,
  onToggleHistory,
  onDiscardDrop,
}) {
  const topHistory = Array.isArray(discardHistory) ? discardHistory.slice(-3) : [];
  const openCard = discardTop || topHistory[topHistory.length - 1] || null;
  const [dropActive, setDropActive] = useState(false);

  const modeText = canDrawFromDeck || canDrawFromDiscard
    ? openCard
      ? "Pick a Card"
      : "Draw from Closed Deck"
    : canDiscard
      ? "Discard a Card"
      : "Waiting for Opponent";

  return (
    <div className="rummy-table-center">
      <div className="rummy-action-arrow">➜</div>

      <button
        type="button"
        onClick={() => canDrawFromDeck && onDrawFromDeck?.()}
        className={`rummy-deck-zone ${canDrawFromDeck ? "enabled" : "disabled"}`}
        title={canDrawFromDeck ? "Pick from closed deck" : "Wait for your turn"}
      >
        <div className="deck-stack">
          <div className="deck-card back one" />
          <div className="deck-card back two" />
          <div className="deck-card back main" />
        </div>
        <div className="deck-count">{drawPileCount || "--"} left</div>
      </button>

      <div className="rummy-phase-label">{modeText}</div>

      <button
        type="button"
        onClick={() => canDrawFromDiscard && onDrawFromDiscard?.()}
        onDragOver={(event) => {
          if (!canDiscard) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          if (!canDiscard) return;
          let card = null;
          try {
            const raw = event.dataTransfer.getData("application/x-rummy-card");
            card = raw ? JSON.parse(raw) : window.__rummyDraggedCard;
          } catch (_) {
            card = window.__rummyDraggedCard;
          }
          if (card) onDiscardDrop?.(card);
          window.__rummyDraggedCard = null;
        }}
        className={`rummy-open-zone rummy-discard-drop-zone ${(canDrawFromDiscard && openCard) || canDiscard ? "enabled" : "disabled"} ${dropActive ? "drop-active" : ""}`}
        title={canDiscard ? "Drop a selected card here" : canDrawFromDiscard ? "Pick from open pile" : "Open pile"}
      >
        {showDiscardHistory && topHistory.length > 1 ? (
          <div className="open-history-fan">
            {topHistory.map((card, index) => (
              <CardFace key={`${card?.cardId || index}-${index}`} card={card} className={`fan-${index}`} />
            ))}
          </div>
        ) : (
          <CardFace card={openCard} />
        )}
        {canDiscard && <span className="drop-card-hint">Drop Here</span>}
        {topHistory.length > 1 && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleHistory?.();
            }}
            className="history-toggle"
          >
            {showDiscardHistory ? "−" : "+"}
          </span>
        )}
      </button>
    </div>
  );
}
