const LINE_BY_COLOR: Record<string, { emoji: string; name: string }> = {
  FEC601: { emoji: "🟡", name: "L1" },
  E60096: { emoji: "🩷", name: "L2" },
  DD052C: { emoji: "🔴", name: "L3" },
  "014A99": { emoji: "🔵", name: "L4" },
  "008F71": { emoji: "🟢", name: "L5" },
  "8884BF": { emoji: "🟣", name: "L6" },
  F28D01: { emoji: "🟠", name: "L7" },
  "82CEE6": { emoji: "🩵", name: "L8" },
  B8804F: { emoji: "🟤", name: "L9" },
  B7DD79: { emoji: "💚", name: "L10" },
};

export function hexToLineEmoji(hex: string | null): string {
  if (!hex) return "⚪";
  return LINE_BY_COLOR[hex.toUpperCase()]?.emoji ?? "⚪";
}

export function hexToLineName(hex: string | null): string | null {
  if (!hex) return null;
  return LINE_BY_COLOR[hex.toUpperCase()]?.name ?? null;
}
