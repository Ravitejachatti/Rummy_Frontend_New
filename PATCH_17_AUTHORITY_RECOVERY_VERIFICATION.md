# Patch 17: Final Authority & Recovery Integration

## Frontend changes

- `src/store/slices/gameSlice.js`
  - Added `allowedActions`, `stateVersion`, `lastActionId`, `settlementStatus`, and `securityError`.
  - Added stale-state protection: incoming states with older `stateVersion` are ignored.
  - Added `getActiveGame` thunk for `/api/rummy/me/active-game`.
  - Socket action wrappers now pass `stateVersion`.

- `src/utils/normalizeGameSocketPayload.js`
  - Normalizes `allowedActions`, `stateVersion`, `settlementStatus`, `lastActionId`, and `myHand`.
  - Supports both top-level recovery responses and nested `activeGame` payloads.

- `src/api/rummySocketApi.js`
  - Emits `stateVersion` with draw, discard, drop, declare, and show-confirm actions.

- `src/components/game/GameTable.jsx`
  - Buttons/actions are now gated by backend-provided `allowedActions`, not local turn guessing.
  - Security/frozen-wallet errors are captured for explicit overlay display.

- `src/components/game/GameHUD.jsx`
  - Drop and Show buttons use server-authoritative allowed actions.

- `src/components/game/TableCenter.jsx`
  - Deck, open-pile draw, and discard-drop zone use allowed-action props.

- `src/components/game/PlayerHand.jsx`
  - Drag-to-discard is gated by `canDiscard` from backend allowed actions.

- `src/hooks/useActiveGameDetector.js`
  - New hook to auto-resume an active game from the dashboard.

- `src/pages/Dashboard.jsx`
  - Uses `useActiveGameDetector()`.

- `src/components/game/Rummyresult.jsx`
  - Fetches canonical `/api/rummy/games/:gameId/result`, then falls back to legacy `/api/rummy/game/result/:gameId`.
  - Normalizes both result response shapes.

- `src/components/game/SecurityOverlay.jsx`
  - New trust/safety overlay for `ERR_WALLET_FROZEN` and manual-review settlement states.

## Validation

- `npm install` completed.
- `npm run build` completed successfully.
- Build warning remains from existing CSS minification: `Unexpected "{" [css-syntax-error]`. The build still succeeds; this should be cleaned separately in CSS polish.

Recommended local frontend checks:

```bash
npm install
npm run build
```
