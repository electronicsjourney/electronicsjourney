// Curated trusted RSS/Atom feeds for the Quick Learn news engine.
// Each entry maps a default category used when keyword classification is unsure.

export type FeedSource = {
  name: string;
  url: string;
  site: string;
  defaultCategory: string;
};

export const FEEDS: FeedSource[] = [
  { name: "Arduino Blog", url: "https://blog.arduino.cc/feed/", site: "https://blog.arduino.cc", defaultCategory: "arduino" },
  { name: "Raspberry Pi", url: "https://www.raspberrypi.com/news/feed/", site: "https://www.raspberrypi.com", defaultCategory: "raspberry-pi" },
  { name: "Espressif News", url: "https://www.espressif.com/en/news/rss.xml", site: "https://www.espressif.com", defaultCategory: "esp32" },
  { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", site: "https://blogs.nvidia.com", defaultCategory: "ai-hardware" },
  { name: "Intel Newsroom", url: "https://newsroom.intel.com/feed/", site: "https://newsroom.intel.com", defaultCategory: "semiconductor" },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", site: "https://openai.com", defaultCategory: "ai-hardware" },
  { name: "Hackaday", url: "https://hackaday.com/feed/", site: "https://hackaday.com", defaultCategory: "electronics" },
  { name: "IEEE Spectrum", url: "https://spectrum.ieee.org/feeds/feed.rss", site: "https://spectrum.ieee.org", defaultCategory: "engineering" },
  { name: "SemiEngineering", url: "https://semiengineering.com/feed/", site: "https://semiengineering.com", defaultCategory: "semiconductor" },
  { name: "AnandTech", url: "https://www.anandtech.com/rss/", site: "https://www.anandtech.com", defaultCategory: "semiconductor" },
];

export const NEWS_CATEGORIES = [
  "electronics",
  "robotics",
  "arduino",
  "esp32",
  "raspberry-pi",
  "ai-hardware",
  "semiconductor",
  "engineering",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
