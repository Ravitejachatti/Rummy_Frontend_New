# Rummy Frontend UX Audit & Redesign Plan — Patch 16

## Scope
This audit focuses on the three highest-impact player journeys:

1. **User Dashboard / Table Selection**
2. **Lobby / Waiting Room**
3. **Game Table / Live Card Play**

The goal is to move the frontend closer to a real mobile-first rummy product: clear table selection, reduced duplicate joins, stronger feedback, better game-state awareness, and sound cues for important actions.

---

## 1. Current UX Issues Found

### Dashboard
- Table cards looked like a generic admin list instead of a game lobby.
- Entry cost, player count, status, and join eligibility were not visually prioritized.
- Mobile users had to scan too much text before deciding where to join.
- No clear game-like hierarchy: wallet, open tables, table status, and table fill state were too flat.

### Lobby
- The lobby previously emitted `join_table` multiple times because socket connect/remount behavior could trigger the join call repeatedly.
- The lobby did not feel like a real waiting room: no strong seat visualization, no minimum-player progress, weak connection status, and unclear next step.
- The unsupported seat/shuffle/cut flow could confuse users because the backend does not currently support those events.
- Users were not clearly told that their seat is reserved and that the game will auto-start.

### Game Table
- `GameTable.jsx` was still calling `joinTable()`, which caused duplicate backend joins after leaving lobby.
- The portrait overlay blocked the full screen. That is risky on mobile because some users cannot rotate immediately or browser orientation lock may fail.
- Important actions lacked consistent feedback: draw, discard, turn change, timeout, invalid declaration, and win should all have immediate sound/haptic-like feedback.
- The top HUD was too small and functional, but not game-like enough for mobile.

---

## 2. Changes Implemented in Patch 16

### Dashboard redesign
- Added premium rummy-style hero area.
- Added wallet, open table, and mode stat cards.
- Redesigned table cards with:
  - entry amount
  - seat count
  - point value
  - live table status
  - visual fill/progress bar
  - stronger join CTA
- Added filters: All, Open, Affordable.
- Added mobile-friendly safety checklist and sound-ready hint.

### Lobby redesign
- Rebuilt lobby as a clear waiting room.
- Added socket connection status.
- Added seat cards for 2–6 players.
- Added minimum-player progress bar.
- Added a stable join guard with `joinSentRef` and `gameStartedRef`.
- Added sound cue when players join.
- Lobby now navigates on:
  - `rummy/game_started`
  - `rummy/state` with `gameId`, `activeGameId`, `phase=PLAYING`, or `status=playing`.
- Removed unsupported visible seat/cut/shuffle action UX from the main lobby flow.

### Game table improvements
- Removed `joinTable()` from `GameTable.jsx`.
- Game table now only loads game state and listens to live events.
- Added sound feedback for:
  - card draw
  - card discard
  - user turn notification
  - timeout/drop warning
  - invalid declaration/error
  - win/auto-win
- Replaced blocking portrait lock with a non-blocking rotate hint.
- Added sound mute/unmute button to the HUD.
- Updated HUD to show game status, turn state, deck count, and player count.

### Socket contract improvement
- Join now uses a stable `clientActionId` per table/browser session.
- This reduces backend duplicate join churn and improves idempotency.

---

## 3. Recommended Next Design Improvements

### High priority
1. Add a visible **turn countdown timer** in the HUD and near the center table.
2. Add **card animation states** for draw/discard success.
3. Add **tap confirmation** before discarding a selected card on mobile.
4. Add **connection/reconnect banner** in the game table.
5. Add **result preview drawer** after a player drops or declares.

### Medium priority
1. Add user avatar/photo support.
2. Add table theme variants: Classic Green, Royal Blue, Gold Pro.
3. Add swipe gestures for card grouping.
4. Add vibration support on mobile using `navigator.vibrate()` for turn and timeout events.
5. Add onboarding tooltip for first-time users: Draw → Arrange → Discard → Declare.

### Backend/frontend coordination needed
1. Backend should emit richer `rummy/game_started` payload:
   - `gameId`
   - `tableId`
   - `status: playing`
   - `phase: PLAYING`
   - `activeGameId`
   - `players`
2. Backend should emit turn deadline in `rummy/state` or `rummy/next_turn` for frontend countdown.
3. Backend should emit clear action acknowledgements for draw/discard/drop/declare.
4. Backend should emit normalized socket errors:
   ```json
   { "code": "INVALID_TURN", "message": "It is not your turn", "recoverable": true }
   ```

---

## 4. Mobile UX Principles Used

- One primary action per screen.
- Large tap targets on game actions.
- Non-blocking warnings instead of full-screen blockers where possible.
- Sound feedback for hidden state changes.
- Seat count and game start progress visible at all times in lobby.
- Dashboard table decision can be made within 2–3 seconds.

---

## 5. Test Checklist

### Dashboard
- Table cards show correctly on mobile and desktop.
- Join button disabled when table inactive/running/insufficient balance.
- Filters work without breaking layout.

### Lobby
- First player joins once and sees 1/N.
- Second player joins and both users navigate to game.
- Refresh/reconnect does not spam repeated join calls.
- Error messages are readable.

### Game Table
- GameTable does not emit `rummy/join_table`.
- Card draw plays sound.
- Card discard plays sound.
- Turn change plays sound when it becomes the current user's turn.
- Drop/timeout/error/win sounds play.
- Portrait mode shows non-blocking rotate hint.
- Sound mute persists in localStorage.
