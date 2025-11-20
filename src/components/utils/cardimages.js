// client/src/utils/cardImages.js


const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Base index in the filename range for each suit
// cardimages_2–14: Spades
// cardimages_15–27: Hearts
// cardimages_28–40: Clubs
// cardimages_41–53: Diamonds
const SUIT_BASE_INDEX = {
  Spades: 2,
  Hearts: 15,
  Clubs: 28,
  Diamonds: 41,
};

/**
 * Returns the image URL for a given card { rank, suit }.
 * Assumes images live in: src/assets/cards/cardimages_X.jpg
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
    return new URL("../../assets/cards/cardsimages_1.jpg", import.meta.url).href;
  }

  // Normalize rank
  // If backend ever sends "1" we treat it as "A"
  const normalizedRank = rankStr === "1" ? "A" : rankStr.toUpperCase();
  const rankIndex = RANKS.indexOf(normalizedRank);

  const baseIndex = SUIT_BASE_INDEX[suitStr];
  if (rankIndex === -1 || !baseIndex) {
    console.warn("Unknown card for image mapping:", card);
    return null;
  }

  const fileIndex = baseIndex + rankIndex; // e.g. Spades A -> 2, K -> 14
  
  // print the file url for debugging
  console.log("Getting image for card:", card);
  console.log("Card image URL:", fileIndex);
  console.log("Full URL:", new URL(
    `../../assets/cards/cardsimages_${fileIndex}.jpg`,
    import.meta.url
  ).href);

  // Adjust path if your folder is different
  return new URL(
    `../../assets/cards/cardsimages_${fileIndex}.jpg`,
    import.meta.url
  ).href;
}