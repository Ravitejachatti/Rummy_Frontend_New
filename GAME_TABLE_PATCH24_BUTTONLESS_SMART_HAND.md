# Patch 24 — Buttonless Smart Hand UX

## Goal
Make the Game Table feel closer to production Indian Rummy UX by removing developer-style manual buttons from the hand area.

## What changed
- Removed Arrange, Sort, Group, Ungroup, and Clear as persistent hand buttons.
- Cards auto-arrange when dealt or updated.
- Valid groups are shown directly as labeled trays: 1st Life, 2nd Life, Impure Run, Set, Life Needed.
- Discard is interaction-first: drag a card to the open pile.
- The hand header now shows compact status chips instead of bulky controls.
- A temporary Clear chip appears only when a card is selected.

## UX reason
Indian Rummy apps reduce hand-management buttons because screen space is limited, especially on mobile landscape. The table should feel like a card table, not an admin panel.

## Backend note
Frontend grouping is only for convenience. Backend declaration validation remains the source of truth.
