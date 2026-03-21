export function hexToLineEmoji(hex: string | null): string {
  if (!hex) return "⚪";
  const map: Record<string, string> = {
    FEC601: "🟡", // L1
    E60096: "🩷", // L2
    DD052C: "🔴", // L3
    "014A99": "🔵", // L4
    "008F71": "🟢", // L5
    "8884BF": "🟣", // L6
    F28D01: "🟠", // L7
    "82CEE6": "🩵", // L8
    B8804F: "🟤", // L9
    B7DD79: "💚", // L10
  };
  return map[hex.toUpperCase()] ?? "⚪";
}
