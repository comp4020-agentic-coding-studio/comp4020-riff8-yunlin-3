import { row } from "./entry.ts";

const e = row("weather");

// Sky, weather and light.
export const WEATHER = [
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
];
