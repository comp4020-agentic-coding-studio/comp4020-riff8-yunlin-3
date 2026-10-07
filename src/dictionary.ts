// Needs review by a Chinese reader before it is trusted.
//
// The seals a visitor may choose from: single characters of the kind
// collectors and painters carved onto their seals (looking, keeping,
// inscribing, and the scenery and states of mind a scholar's studio named
// itself after), in traditional forms to match the original twelve hash
// glyphs. Each row is glyph, pinyin with tone marks, a short English gloss,
// and the English words a visitor can type to find it. Nothing outside this
// list can ever become a seal, and no arbitrary input is ever transliterated:
// that would be a name field in disguise.
export interface SealEntry {
  glyph: string;
  pinyin: string;
  gloss: string;
  words: string[];
}

const e = (glyph: string, pinyin: string, gloss: string, words: string): SealEntry => ({
  glyph,
  pinyin,
  gloss,
  words: words.split(",").map((w) => w.trim()),
});

export const DICTIONARY: readonly SealEntry[] = [
  // The twelve glyphs src/seal.ts hashes an unchosen visitor's token onto.
  e("鑑", "jiàn", "to appraise", "appraise, judge, examine, mirror, connoisseur"),
  e("賞", "shǎng", "to admire", "admire, appreciate, enjoy, relish"),
  e("藏", "cáng", "to treasure and keep", "keep, collect, store, treasure, hoard, collection"),
  e("觀", "guān", "to look closely", "look, view, observe, contemplate, behold"),
  e("閱", "yuè", "to read through", "read, peruse, review, browse"),
  e("記", "jì", "to record, to remember", "record, remember, note, write"),
  e("題", "tí", "to inscribe", "inscribe, inscription, title, write"),
  e("珍", "zhēn", "to treasure", "treasure, precious, cherish, rare"),
  e("玩", "wán", "to savour", "savour, savor, play, linger"),
  e("守", "shǒu", "to guard", "guard, keep, protect, watch, defend"),
  e("傳", "chuán", "to pass on", "pass, transmit, inherit, legacy, tradition"),
  e("校", "jiào", "to compare, to proofread", "compare, proofread, check, collate, correct"),

  // Looking, writing, keeping.
  e("看", "kàn", "to look", "look, see, watch"),
  e("見", "jiàn", "to see", "see, meet, witness"),
  e("望", "wàng", "to gaze into the distance", "gaze, hope, wish, look"),
  e("眼", "yǎn", "eye", "eye, eyes"),
  e("過", "guò", "to pass by", "pass, past, cross, visit"),
  e("聽", "tīng", "to listen", "listen, hear"),
  e("寫", "xiě", "to write, to sketch", "write, sketch, copy"),
  e("書", "shū", "writing, book", "book, calligraphy, writing, letter, write"),
  e("畫", "huà", "painting", "painting, picture, paint, draw"),
  e("詩", "shī", "poem", "poem, poetry, verse"),
  e("印", "yìn", "seal", "seal, stamp, print"),
  e("筆", "bǐ", "brush", "brush, pen, writing"),
  e("墨", "mò", "ink", "ink, black"),
  e("紙", "zhǐ", "paper", "paper, sheet"),
  e("硯", "yàn", "inkstone", "inkstone"),
  e("琴", "qín", "zither", "zither, qin, music"),
  e("言", "yán", "word, speech", "word, words, speech, say"),
  e("問", "wèn", "to ask", "ask, question, wonder"),
  e("學", "xué", "to learn", "learn, study, scholar"),
  e("知", "zhī", "to know", "know, knowledge, understand"),
  e("留", "liú", "to stay, to leave behind", "stay, remain, leave, linger"),

  // Memory and feeling.
  e("心", "xīn", "heart, mind", "heart, mind, feeling"),
  e("思", "sī", "to think, to long for", "think, thought, longing, miss"),
  e("念", "niàn", "to keep in mind", "remember, recall, miss, think"),
  e("憶", "yì", "to recall", "recall, memory, remember"),
  e("夢", "mèng", "dream", "dream, sleep"),
  e("情", "qíng", "feeling", "feeling, emotion, sentiment"),
  e("愛", "ài", "love", "love, fond"),
  e("惜", "xī", "to cherish", "cherish, value, regret"),
  e("悟", "wù", "to awaken, to realise", "awaken, realise, realize, insight, understand"),
  e("樂", "lè", "joy", "joy, happy, glad, delight"),
  e("友", "yǒu", "friend", "friend, companion"),
  e("緣", "yuán", "affinity, fate", "fate, affinity, chance, destiny"),

  // States a studio might be named for.
  e("靜", "jìng", "still, quiet", "still, quiet, calm, silent, silence"),
  e("遠", "yuǎn", "far", "far, distant, remote"),
  e("歸", "guī", "to return home", "return, home, homecoming"),
  e("閒", "xián", "leisure", "leisure, idle, ease"),
  e("逸", "yì", "untrammelled, at ease", "carefree, free, untrammelled, ease"),
  e("澹", "dàn", "tranquil", "tranquil, serene, placid"),
  e("清", "qīng", "clear, pure", "clear, pure, clean, clarity"),
  e("空", "kōng", "empty", "empty, emptiness, void, space"),
  e("虛", "xū", "empty, open", "open, humble, empty"),
  e("樸", "pǔ", "plain, uncarved", "plain, simple, uncarved"),
  e("拙", "zhuō", "artless, clumsy", "artless, clumsy, humble"),
  e("隱", "yǐn", "hidden, a recluse", "hidden, recluse, hermit, retreat, hide"),
  e("孤", "gū", "alone", "alone, lonely, solitary"),
  e("寒", "hán", "cold", "cold, wintry, winter"),
  e("安", "ān", "at peace, safe", "peace, safe, rest, calm"),
  e("和", "hé", "harmony", "harmony, gentle, peace"),
  e("真", "zhēn", "true", "true, real, genuine, truth"),
  e("善", "shàn", "good", "good, kind, virtue"),
  e("美", "měi", "beautiful", "beauty, beautiful"),
  e("古", "gǔ", "ancient", "ancient, old, antique"),
  e("新", "xīn", "new", "new, fresh"),
  e("初", "chū", "beginning", "beginning, first, start, origin"),
  e("永", "yǒng", "forever", "forever, eternal, always"),
  e("恆", "héng", "constant", "constant, steady, persistent"),
  e("壽", "shòu", "long life", "longevity, life, age"),
  e("福", "fú", "good fortune", "fortune, luck, blessing"),
  e("一", "yī", "one", "one, single, unity"),

  // Ways of going on.
  e("道", "dào", "the way", "way, path, road, tao"),
  e("行", "xíng", "to walk, to go", "walk, go, travel"),
  e("遊", "yóu", "to wander", "wander, roam, journey, travel"),
  e("居", "jū", "to dwell", "dwell, live, reside, home"),
  e("家", "jiā", "home, family", "home, family, house"),
  e("德", "dé", "virtue", "virtue, integrity"),
  e("仁", "rén", "benevolence", "benevolence, kindness, humane"),
  e("誠", "chéng", "sincerity", "sincere, sincerity, honest"),
  e("信", "xìn", "trust", "trust, faith, believe"),
  e("忍", "rěn", "to endure", "endure, patience, bear"),
  e("勤", "qín", "diligent", "diligent, hardworking"),
  e("慎", "shèn", "careful", "careful, cautious, prudent"),
  e("敬", "jìng", "reverence", "respect, reverence, honour, honor"),

  // Scenery.
  e("山", "shān", "mountain", "mountain, hill"),
  e("峰", "fēng", "peak", "peak, summit"),
  e("谷", "gǔ", "valley", "valley, gorge"),
  e("石", "shí", "rock", "rock, stone, boulder, granite"),
  e("水", "shuǐ", "water", "water"),
  e("川", "chuān", "river", "river"),
  e("江", "jiāng", "great river", "river, yangtze"),
  e("溪", "xī", "brook", "brook, creek, stream"),
  e("泉", "quán", "spring", "spring, fountain, source"),
  e("湖", "hú", "lake", "lake"),
  e("海", "hǎi", "sea", "sea, ocean"),
  e("天", "tiān", "sky, heaven", "sky, heaven"),
  e("日", "rì", "sun, day", "sun, day"),
  e("月", "yuè", "moon", "moon, month"),
  e("星", "xīng", "star", "star, stars"),
  e("雲", "yún", "cloud", "cloud, clouds"),
  e("風", "fēng", "wind", "wind, breeze"),
  e("雨", "yǔ", "rain", "rain"),
  e("雪", "xuě", "snow", "snow"),
  e("霜", "shuāng", "frost", "frost"),
  e("露", "lù", "dew", "dew"),
  e("煙", "yān", "mist, smoke", "smoke, haze, mist"),
  e("霧", "wù", "fog", "fog, mist"),
  e("光", "guāng", "light", "light, shine"),
  e("明", "míng", "bright", "bright, brilliant, clear"),
  e("影", "yǐng", "shadow", "shadow, reflection"),
  e("聲", "shēng", "sound", "sound, voice"),
  e("春", "chūn", "spring", "spring"),
  e("秋", "qiū", "autumn", "autumn, fall"),
  e("夜", "yè", "night", "night, evening"),
  e("朝", "zhāo", "morning", "morning, dawn"),
  e("松", "sōng", "pine", "pine, evergreen, spruce"),
  e("竹", "zhú", "bamboo", "bamboo"),
  e("梅", "méi", "plum blossom", "plum, blossom"),
  e("蘭", "lán", "orchid", "orchid"),
  e("菊", "jú", "chrysanthemum", "chrysanthemum"),
  e("蓮", "lián", "lotus", "lotus"),
  e("柳", "liǔ", "willow", "willow"),
  e("楓", "fēng", "maple", "maple"),
  e("林", "lín", "grove, forest", "forest, grove, woods, trees"),
  e("木", "mù", "tree, wood", "tree, wood, timber"),
  e("草", "cǎo", "grass", "grass, herb, plant"),
  e("苔", "tái", "moss", "moss, lichen"),
  e("葉", "yè", "leaf", "leaf, leaves"),
  e("花", "huā", "flower", "flower, blossom"),
  e("鶴", "hè", "crane", "crane"),
  e("雁", "yàn", "wild goose", "goose"),
  e("魚", "yú", "fish", "fish"),
  e("鳥", "niǎo", "bird", "bird"),
  e("舟", "zhōu", "boat", "boat"),
  e("橋", "qiáo", "bridge", "bridge"),
  e("亭", "tíng", "pavilion", "pavilion"),
  e("門", "mén", "gate", "gate, door"),
  e("窗", "chuāng", "window", "window"),
  e("燈", "dēng", "lantern", "lantern, lamp"),
  e("茶", "chá", "tea", "tea"),
  e("香", "xiāng", "fragrance, incense", "fragrance, incense, scent"),
];

const BY_GLYPH = new Map(DICTIONARY.map((entry) => [entry.glyph, entry]));

export function lookupGlyph(glyph: string): SealEntry | undefined {
  return BY_GLYPH.get(glyph);
}

const normalise = (s: string): string => s.trim().toLowerCase().replace(/[^a-z ]/g, "");

// Exact word matches first, then a prefix match for three or more letters
// ("rem" finds remember, recall's 念 and 憶 too, by their words).
export function searchSeals(query: string): SealEntry[] {
  const q = normalise(query);
  if (q.length === 0) return [];
  const exact = DICTIONARY.filter((entry) => entry.words.includes(q));
  if (exact.length > 0) return exact;
  if (q.length < 3) return [];
  return DICTIONARY.filter((entry) => entry.words.some((w) => w.startsWith(q)));
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

const ALL_WORDS = [...new Set(DICTIONARY.flatMap((entry) => entry.words))];
const FALLBACK_SUGGESTIONS = ["keep", "look", "mountain", "remember", "dream"];

// When a word finds nothing: the dictionary's own words nearest in spelling,
// or a few starting points. Only ever words from the list, never the input.
export function suggestWords(query: string): string[] {
  const q = normalise(query);
  if (q.length === 0) return FALLBACK_SUGGESTIONS;
  const near = ALL_WORDS.map((w) => ({ w, d: distance(q, w) }))
    .filter(({ d }) => d <= Math.max(1, Math.floor(q.length / 3)))
    .sort((a, b) => a.d - b.d || a.w.localeCompare(b.w))
    .slice(0, 5)
    .map(({ w }) => w);
  return near.length > 0 ? near : FALLBACK_SUGGESTIONS;
}
