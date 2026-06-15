// Beginner-friendly summarizer using the Lovable AI Gateway.
// Falls back to a trimmed version of the source description on failure.

export async function summarize(input: {
  title: string;
  description: string;
  source: string;
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const fallback = makeFallback(input.description);
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
              "You write short, beginner-friendly news summaries for an electronics & robotics learning app. " +
              "Stay factual. No hype, no clickbait. 60–110 words. One short paragraph. " +
              "Do not invent details that are not in the source.",
          },
          {
            role: "user",
            content:
              `Source: ${input.source}\nHeadline: ${input.title}\n\nArticle text:\n${input.description.slice(0, 4000)}\n\n` +
              "Write the summary now.",
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) return fallback;
    const json: any = await res.json();
    const text: string | undefined = json?.choices?.[0]?.message?.content;
    if (!text) return fallback;
    const cleaned = text.trim().replace(/^["']|["']$/g, "");
    return cleaned.length < 30 ? fallback : cleaned;
  } catch {
    return fallback;
  }
}

function makeFallback(desc: string): string {
  const t = (desc || "").replace(/\s+/g, " ").trim();
  if (!t) return "Read the full article at the source link for details.";
  if (t.length <= 600) return t;
  return t.slice(0, 600).replace(/\s+\S*$/, "") + "…";
}
