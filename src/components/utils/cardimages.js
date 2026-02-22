// client/src/utils/cardImages.js
// Optimized: 200×280 WebP images (~5-24 KB each, 464 KB total)
// Previously: 5120×3617 JPG images (~1-2.4 MB each, 58 MB total)

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Base index in the filename range for each suit
// cardsimages_2–14: Spades
// cardsimages_15–27: Hearts
// cardsimages_28–40: Clubs
// cardsimages_41–53: Diamonds
const SUIT_BASE_INDEX = {
  Spades: 2,
  Hearts: 15,
  Clubs: 28,
  Diamonds: 41,
};

/**
 * Returns the optimized WebP image URL for a given card { rank, suit }.
 */
export function getCardImage(card) {
  if (!card) return null;

  const rankStr = String(card.rank).trim();
  const suitStr = String(card.suit).trim();

  // Joker handling
  if (
    rankStr.toLowerCase() === "joker" ||
    suitStr.toLowerCase() === "joker"
  ) {
    return new URL("../../assets/cards/optimized/cardsimages_1.webp", import.meta.url).href;
  }

  // Normalize rank — backend may send "1" for Ace
  const normalizedRank = rankStr === "1" ? "A" : rankStr.toUpperCase();
  const rankIndex = RANKS.indexOf(normalizedRank);

  const baseIndex = SUIT_BASE_INDEX[suitStr];
  if (rankIndex === -1 || !baseIndex) {
    console.warn("Unknown card for image mapping:", card);
    return null;
  }

  const fileIndex = baseIndex + rankIndex; // e.g. Spades A -> 2, K -> 14

  return new URL(
    `../../assets/cards/optimized/cardsimages_${fileIndex}.webp`,
    import.meta.url
  ).href;
}

/**
 * Preload all 53 card images into browser cache.
 * Call once on game mount for instant card rendering.
 */
let _preloaded = false;
export function preloadAllCards() {
  if (_preloaded) return;
  _preloaded = true;

  for (let i = 1; i <= 53; i++) {
    const img = new Image();
    img.src = new URL(
      `../../assets/cards/optimized/cardsimages_${i}.webp`,
      import.meta.url
    ).href;
  }
  // Also preload back card
  const back = new Image();
  back.src = new URL(
    "../../assets/cards/optimized/back_card.webp",
    import.meta.url
  ).href;
}