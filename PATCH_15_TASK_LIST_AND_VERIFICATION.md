# Patch 15 — Frontend Contract Alignment + Recovery Cleanup

## Task checklist

| # | Task | Status |
|---|---|---|
| 1 | Add frontend socket/REST payload normalizer | Resolved |
| 2 | Normalize `discardHistory`, old `drawPileTop`, and `discardTop` fallback | Resolved |
| 3 | Fix frontend declaration socket payload to match backend contract | Resolved |
| 4 | Normalize draw source to only `draw` or `discard` | Resolved |
| 5 | Apply full public state on `rummy/state` and `rummy/game_started` | Resolved |
| 6 | Refresh game state after reconnect/player-connected events | Resolved |
| 7 | Replace hard Axios redirect with `auth:logout` event | Resolved |
| 8 | Add local auth logout reducer for SPA-safe logout | Resolved |
| 9 | Add `clientActionId` to hand reorder event | Resolved |
| 10 | Remove shipped `.env` files and keep `.env.example` only | Resolved |

## Frontend files changed

- `src/utils/normalizeGameSocketPayload.js` — new
- `src/api/rummySocketApi.js`
- `src/config/api.js`
- `src/core/SocketManager.jsx`
- `src/store/slices/authSlice.js`
- `src/store/slices/gameSlice.js`
- `src/components/game/GameTable.jsx`
- `src/pages/Lobby.jsx`
- `.gitignore`
- `.env.example`

## Validation performed

The following frontend JavaScript files passed `node --check` syntax validation:

- `src/api/rummySocketApi.js`
- `src/config/api.js`
- `src/config/socket.js`
- `src/store/slices/authSlice.js`
- `src/store/slices/gameSlice.js`
- `src/utils/normalizeGameSocketPayload.js`

`npm run build` could not complete in this environment because dependencies are not installed in the uploaded zip (`vite: not found`). Run these locally before deployment:

```bash
npm install
npm run build
```
