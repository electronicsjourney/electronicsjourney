// Beginner-friendly summarizer using the Lovable AI Gateway.
// Goal: 40–70 words, 5–6 short lines, no scrolling needed on a card.
// Always written in our own words to avoid republishing copyrighted text.

const MAX_WORDS = 70;
const MIN_WORDS = 30;

export async function summarize(input: {
  title: string;
  description: string;
  source: string;
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const fallback = clamp(makeFallback(input.title, input.description));
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "raw",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You write ultra-short electronics/robotics news summaries for a '1-minute learning' feed. " +
              "Rules: 40–70 words. 5–6 short sentences max. Plain English for beginners. " +
              "No jargon unless essential. No hype, no clickbait, no quotes. " +
              "Write in your OWN words — never copy phrases from the source. " +
              "Output ONLY the summary text, no headings or labels.",
          },
          {
            role: "user",
            content:
              `Source: ${input.source}\nHeadline: ${input.title}\n\nArticle text:\n${input.description.slice(0, 3500)}\n\n` +
              "Write the 40–70 word summary now.",
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) return fallback;
    const json: any = await res.json();
    const text: string | undefined = json?.choices?.[0]?.message?.content;
    if (!text) return fallback;
    const cleaned = clamp(text.trim().replace(/^["']|["']$/g, ""));
    return wordCount(cleaned) < MIN_WORDS ? fallback : cleaned;
  } catch {
    return fallback;
  }
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Hard-clamp to MAX_WORDS, ending on a clean sentence/word. */
function clamp(s: string): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const words = t.split(" ");
  if (words.length <= MAX_WORDS) return t;
  const cut = words.slice(0, MAX_WORDS).join(" ");
  // try to end at last sentence boundary
  const lastPunct = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  if (lastPunct > cut.length * 0.6) return cut.slice(0, lastPunct + 1);
  return cut.replace(/[,;:\s]+\S*$/, "") + "…";
}

function makeFallback(title: string, desc: string): string {
  const t = (desc || "").replace(/\s+/g, " ").trim();
  if (!t) return `${title}. Read the full article at the source for details.`;
  return t;
}
