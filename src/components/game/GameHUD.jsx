import React from "react";
import { Volume2, VolumeX, Settings, ArrowLeft } from "lucide-react";

export default function GameHUD({
  gameStatus = "waiting",
  isMyTurn = false,
  allowedActions = [],
  drawPileCount,
  tableInfo,
  onDrop,
  onDeclare,
  onBack,
  canDeclare = false,
  isMuted = false,
  onToggleMute,
}) {
  const actions = Array.isArray(allowedActions) ? allowedActions : [];
  const canDrop = actions.includes("DROP");
  const canShow = actions.includes("DECLARE") || canDeclare;
  const isPlaying = String(gameStatus || "").toUpperCase() === "PLAYING";

  return (
    <div className="rummy-pro-hud">
      <div className="rummy-hud-left">
        <button onClick={onBack} className="rummy-icon-button" title="Back to dashboard">
          <ArrowLeft size={18} />
        </button>
        <button className="rummy-green-icon" title="Settings">
          <Settings size={18} />
        </button>
        <div className="rummy-stake-pill">
          <span className="coin-dot">●</span>
          <span>{tableInfo?.chipValue || 10}/ Points</span>
        </div>
        <div className={`rummy-turn-pill ${isMyTurn ? "active" : ""}`}>
          {isMyTurn ? "YOUR TURN" : String(gameStatus || "WAITING").toUpperCase()}
        </div>
      </div>

      <div className="rummy-hud-right">
        <div className="rummy-balance-pill">
          <span className="coin-dot">●</span>
          <span>5,460</span>
        </div>
        <div className="rummy-mini-pill">Deck {Number.isFinite(drawPileCount) ? drawPileCount : "--"}</div>
        {isPlaying && (
          <>
            <button onClick={onDrop} disabled={!canDrop} className="rummy-drop-btn disabled:opacity-50 disabled:cursor-not-allowed">Drop</button>
            <button onClick={onDeclare} disabled={!canShow} className="rummy-show-btn disabled:opacity-50 disabled:cursor-not-allowed">
              Show
            </button>
          </>
        )}
        <button 
          onClick={onToggleMute} 
          className={`rummy-green-icon ${isMuted ? "opacity-50" : ""}`} 
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
}
