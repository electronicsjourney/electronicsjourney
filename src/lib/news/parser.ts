// Tiny dependency-free RSS / Atom parser. Worker-safe (no DOMParser, no Node native libs).

export type FeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  image?: string;
};

function decodeEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripHtml(s: string): string {
  return decodeEntities(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pickTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : undefined;
}

function pickAttr(block: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*"([^"]+)"[^>]*/?>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : undefined;
}

function findImage(block: string): string | undefined {
  // <enclosure url="..." type="image/..."
  const enc = block.match(/<enclosure\b[^>]*url\s*=\s*"([^"]+\.(?:jpg|jpeg|png|webp|gif))"/i);
  if (enc) return enc[1];
  // <media:content url="..."
  const media = block.match(/<media:(?:content|thumbnail)\b[^>]*url\s*=\s*"([^"]+)"/i);
  if (media) return media[1];
  // first <img src="...">
  const img = block.match(/<img\b[^>]*src\s*=\s*"([^"]+)"/i);
  if (img) return img[1];
  return undefined;
}

export function parseFeed(xml: string): FeedItem[] {
  if (!xml) return [];
  const items: FeedItem[] = [];

  // RSS <item>
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = pickTag(block, "title") || "";
    const link =
      pickTag(block, "link") ||
      pickAttr(block, "link", "href") ||
      pickTag(block, "guid") ||
      "";
    const pubDate = pickTag(block, "pubDate") || pickTag(block, "dc:date") || "";
    const description =
      pickTag(block, "content:encoded") ||
      pickTag(block, "description") ||
      pickTag(block, "summary") ||
      "";
    const image = findImage(block) || findImage(description);
    if (title && link) {
      items.push({
        title: stripHtml(title),
        link: link.trim(),
        pubDate,
        description: stripHtml(description),
        image,
      });
    }
  }

  // Atom <entry>
  if (items.length === 0) {
    const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRe.exec(xml))) {
      const block = m[1];
      const title = pickTag(block, "title") || "";
      const link = pickAttr(block, "link", "href") || pickTag(block, "id") || "";
      const pubDate = pickTag(block, "updated") || pickTag(block, "published") || "";
      const description = pickTag(block, "summary") || pickTag(block, "content") || "";
      const image = findImage(block) || findImage(description);
      if (title && link) {
        items.push({
          title: stripHtml(title),
          link: link.trim(),
          pubDate,
          description: stripHtml(description),
          image,
        });
      }
    }
  }

  return items;
}
