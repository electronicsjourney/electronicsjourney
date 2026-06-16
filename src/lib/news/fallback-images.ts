// Licensed fallback images (Unsplash / Pexels / Wikimedia — free to use with attribution).
// We HOT-LINK these; we do NOT download or re-host third-party images.
//
// Each entry records the public source name so we can attribute it in the UI
// and the database (image_source_name column).

export type FallbackImage = { url: string; sourceName: string };

export const CATEGORY_FALLBACK: Record<string, FallbackImage> = {
  arduino: {
    url: "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  esp32: {
    url: "https://images.unsplash.com/photo-1581090700227-1e8e3a9e1f5d?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  iot: {
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  "raspberry-pi": {
    url: "https://images.unsplash.com/photo-1587578932008-19dde0042cfb?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  robotics: {
    url: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  "ai-hardware": {
    url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  semiconductor: {
    url: "https://images.unsplash.com/photo-1610465299996-30f240ac2b1c?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  engineering: {
    url: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
  electronics: {
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=70&auto=format&fit=crop",
    sourceName: "Unsplash",
  },
};

// Final brand fallback (Electronics Journey default).
export const BRAND_DEFAULT: FallbackImage = {
  url: "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=1200&q=70&auto=format&fit=crop",
  sourceName: "Electronics Journey",
};

export function fallbackImage(category: string): FallbackImage {
  return CATEGORY_FALLBACK[category] ?? CATEGORY_FALLBACK.electronics ?? BRAND_DEFAULT;
}

// Back-compat shim if anything still imports the old name.
export const CATEGORY_FALLBACK_IMAGE: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_FALLBACK).map(([k, v]) => [k, v.url]),
);
