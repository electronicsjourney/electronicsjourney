import type { NewsCategory } from "./feeds";

const KEYWORDS: Record<NewsCategory, RegExp> = {
  "arduino": /\barduino\b|\buno\b|\bnano (?:every|33)\b|\batmega\b/i,
  "esp32": /\besp32\b|\besp8266\b|\bespressif\b|\bmicropython\b/i,
  "raspberry-pi": /\braspberry pi\b|\braspi\b|\brp2040\b|\bpico\b/i,
  "robotics": /\brobot(?:s|ics|ic)?\b|\bdrone\b|\bservo\b|\bactuator\b|\bautonomous\b|\bgripper\b|\bmanipulator\b/i,
  "ai-hardware": /\bgpu\b|\bnpu\b|\btpu\b|\bnvidia\b|\bcuda\b|\bllm\b|\bai chip\b|\binference\b|\baccelerator\b|\bopenai\b/i,
  "semiconductor": /\bsemiconductor\b|\bfoundry\b|\bnode\b.*\bnm\b|\btsmc\b|\bintel\b|\blithograph(?:y|er)\b|\bwafer\b|\bchip(?:set)?\b|\bsoc\b/i,
  "engineering": /\bengineer(?:ing)?\b|\binnovation\b|\bresearch\b|\bpatent\b|\bbreakthrough\b/i,
  "electronics": /\bpcb\b|\bcircuit\b|\bsensor\b|\boscilloscope\b|\bsoldering\b|\bcomponent\b|\bmcu\b|\bmicrocontroller\b|\biot\b/i,
};

const PRIORITY: NewsCategory[] = [
  "arduino",
  "esp32",
  "raspberry-pi",
  "robotics",
  "ai-hardware",
  "semiconductor",
  "engineering",
  "electronics",
];

export function classify(text: string, fallback: string): NewsCategory {
  const lower = ` ${text} `;
  for (const cat of PRIORITY) {
    if (KEYWORDS[cat].test(lower)) return cat;
  }
  return (PRIORITY as readonly string[]).includes(fallback)
    ? (fallback as NewsCategory)
    : "electronics";
}
