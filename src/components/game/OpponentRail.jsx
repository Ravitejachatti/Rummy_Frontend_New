import React from "react";

const getInitial = (name = "P") => {
  return String(name || "P").charAt(0).toUpperCase();
};

const OpponentRail = ({ players = [], currentTurn, myPlayerId }) => {
  const opponents = players.filter(
    (p) => String(p.playerId) !== String(myPlayerId)
  );

  return (
    <div className="opponent-rail">
      {opponents.length === 0 ? (
        <div className="opponent-slot empty">
          Waiting for opponent
        </div>
      ) : (
        opponents.map((player) => {
          const isTurn = String(currentTurn) === String(player.playerId);
          const isDisconnected =
            player.connected === false ||
            String(player.status || "").toUpperCase() === "DISCONNECTED";

          return (
            <div
              key={player.playerId}
              className={`opponent-slot ${isTurn ? "active-turn" : ""}`}
            >
              <div className="opponent-avatar">
                {getInitial(player.username)}
              </div>

              <div className="opponent-info">
                <div className="opponent-name">
                  {player.username || "Player"}
                </div>

                <div className="opponent-meta">
                  <span>{player.handCount ?? player.hand?.length ?? 13} cards</span>
                  {isDisconnected && <span className="disconnect-badge">Offline</span>}
                </div>
              </div>

              {isTurn && <div className="turn-ring" />}
            </div>
          );
        })
      )}
    </div>
  );
};

export default OpponentRail;