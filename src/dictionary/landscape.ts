import { row } from "./entry.ts";

const e = row("landscape");

// Mountains, water and places. Only 山 answers to "mountain"; its kin use
// narrower words (peak, ridge, cliff) so the search stays sharp.
export const LANDSCAPE = [
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
  e("舟", "zhōu", "boat", "boat"),
  e("橋", "qiáo", "bridge", "bridge"),
  e("亭", "tíng", "pavilion", "pavilion"),
  e("歸", "guī", "to return home", "return, home, homecoming"),
  e("行", "xíng", "to walk, to go", "walk, go, travel"),
  e("遊", "yóu", "to wander", "wander, roam, journey, travel"),
];
