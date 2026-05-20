import React from "react";

const PlayerActionBar = ({
  isMyTurn,
  selectedCard,
  onSort,
  onGroup,
  onDiscardSelected,
  onDeclare,
  onDrop,
  canDeclare = true,
  muted,
  onToggleMute,
}) => {
  return (
    <div className="player-action-bar">
      <div className="action-left">
        <button className="mini-action-btn" onClick={onSort}>
          Sort
        </button>

        <button className="mini-action-btn" onClick={onGroup}>
          Group
        </button>

        <button
          className="mini-action-btn sound-btn"
          onClick={onToggleMute}
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className="selected-card-status">
        {selectedCard ? (
          <>
            <span className="selected-label">Selected</span>
            <span className="selected-card-name">
              {selectedCard.rank} {selectedCard.suit}
            </span>
          </>
        ) : (
          <span className="selected-placeholder">
            {isMyTurn ? "Select a card to discard" : "Waiting for your turn"}
          </span>
        )}
      </div>

      <div className="action-right">
        <button
          className="discard-btn"
          disabled={!isMyTurn || !selectedCard}
          onClick={onDiscardSelected}
        >
          Discard
        </button>

        <button
          className="declare-btn"
          disabled={!isMyTurn || !canDeclare}
          onClick={onDeclare}
        >
          Declare
        </button>

        <button className="drop-btn" onClick={onDrop}>
          Drop
        </button>
      </div>
    </div>
  );
};

export default PlayerActionBar;