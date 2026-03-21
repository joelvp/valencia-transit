const LINE_BY_NUMBER: Record<string, { emoji: string; name: string }> = {
  "1": { emoji: "🟡", name: "L1" },
  "2": { emoji: "🩷", name: "L2" },
  "3": { emoji: "🔴", name: "L3" },
  "4": { emoji: "🔵", name: "L4" },
  "5": { emoji: "🟢", name: "L5" },
  "6": { emoji: "🟣", name: "L6" },
  "7": { emoji: "🟠", name: "L7" },
  "8": { emoji: "🩵", name: "L8" },
  "9": { emoji: "🟤", name: "L9" },
  "10": { emoji: "💚", name: "L10" },
};

export function lineNumberToEmoji(lineNumber: string): string {
  return LINE_BY_NUMBER[lineNumber]?.emoji ?? "⚪";
}

export function lineNumberToName(lineNumber: string): string {
  return LINE_BY_NUMBER[lineNumber]?.name ?? `L${lineNumber}`;
}
