import { row } from "./entry.ts";

const e = row("craft");

// Crafts and arts: painting, music, the tea table, tools of the studio.
export const CRAFT = [
  e("畫", "huà", "painting", "painting, picture, paint, draw"),
  e("詩", "shī", "poem", "poem, poetry, verse"),
  e("印", "yìn", "seal", "seal, stamp, print"),
  e("琴", "qín", "zither", "zither, qin, music"),
  e("燈", "dēng", "lantern", "lantern, lamp"),
  e("茶", "chá", "tea", "tea"),
  e("香", "xiāng", "fragrance, incense", "fragrance, incense, scent"),
];
