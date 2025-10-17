// client/src/utils/rummyRules.js
export const JOKER_RANKS = ['JOKER'];

export const RANK_MAP = {
  A: [1, 14], '2':[2],'3':[3],'4':[4],'5':[5],'6':[6],
  '7':[7],'8':[8],'9':[9],'10':[10],'J':[11],'Q':[12],'K':[13]
};

const toNums = (card) => RANK_MAP[card.rank] || [];

export function isPureSequence(set) {
  if (set.length < 3) return false;
  const suit = set[0].suit;
  if (set.some(c => JOKER_RANKS.includes(c.rank) || c.suit !== suit)) return false;
  const sorted = set.map(c => toNums(c)[0]).sort((a,b)=>a-b);
  for (let i=1;i<sorted.length;i++) if (sorted[i] !== sorted[i-1]+1) return false;
  return true;
}

export function isTriplet(set) {
  if (set.length !== 3) return false;
  const nonJoker = set.find(c=>!JOKER_RANKS.includes(c.rank));
  if (!nonJoker) return true;
  return set.every(c=>JOKER_RANKS.includes(c.rank) || c.rank===nonJoker.rank);
}

export function isSequence(set) {
  if (set.length < 3) return false;
  const suit = set.find(c=>!JOKER_RANKS.includes(c.rank))?.suit;
  if (!suit) return true;
  let jokers = 0;
  const ranks = [];
  for (const c of set) {
    if (JOKER_RANKS.includes(c.rank)) jokers++;
    else if (c.suit!==suit) return false;
    else ranks.push(toNums(c)[0]);
  }
  ranks.sort((a,b)=>a-b);
  let gaps=0;
  for (let i=1;i<ranks.length;i++) gaps+=ranks[i]-ranks[i-1]-1;
  return gaps <= jokers;
}

export function classifyGroup(g) {
  if (isPureSequence(g)) return 'Pure Sequence';
  if (isSequence(g)) return 'Impure Sequence';
  if (isTriplet(g)) return 'Triplet';
  return 'Others';
}