// Category fallback images (Unsplash free-license; replace as needed).
export const CATEGORY_FALLBACK_IMAGE: Record<string, string> = {
  electronics: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=70&auto=format&fit=crop",
  robotics: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&q=70&auto=format&fit=crop",
  arduino: "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=1200&q=70&auto=format&fit=crop",
  esp32: "https://images.unsplash.com/photo-1581090700227-1e8e3a9e1f5d?w=1200&q=70&auto=format&fit=crop",
  "raspberry-pi": "https://images.unsplash.com/photo-1587578932008-19dde0042cfb?w=1200&q=70&auto=format&fit=crop",
  "ai-hardware": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=70&auto=format&fit=crop",
  semiconductor: "https://images.unsplash.com/photo-1610465299996-30f240ac2b1c?w=1200&q=70&auto=format&fit=crop",
  engineering: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=1200&q=70&auto=format&fit=crop",
};

export function fallbackImage(category: string): string {
  return CATEGORY_FALLBACK_IMAGE[category] ?? CATEGORY_FALLBACK_IMAGE.electronics;
}
