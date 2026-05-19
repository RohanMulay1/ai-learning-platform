import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function masteryColor(level: number): string {
  if (level >= 0.9) return "text-purple-600";
  if (level >= 0.7) return "text-emerald-600";
  if (level >= 0.4) return "text-amber-600";
  if (level > 0) return "text-red-500";
  return "text-gray-400";
}

export function masteryBg(level: number): string {
  if (level >= 0.9) return "bg-purple-500";
  if (level >= 0.7) return "bg-emerald-500";
  if (level >= 0.4) return "bg-amber-500";
  if (level > 0) return "bg-red-400";
  return "bg-gray-300";
}

// Single canonical difficulty badge — use everywhere
export function diffClass(difficulty: string): string {
  return {
    easy:   "bg-green-50 text-green-700 border-green-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard:   "bg-red-50 text-red-600 border-red-200",
  }[difficulty] ?? "bg-gray-100 text-gray-500 border-gray-200";
}

export function difficultyColor(difficulty: string): string {
  return {
    easy: "text-green-600",
    medium: "text-amber-600",
    hard: "text-red-500",
  }[difficulty] ?? "text-gray-400";
}

export function rarityColor(rarity: string): string {
  return {
    common: "text-gray-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
  }[rarity] ?? "text-gray-400";
}

export function rarityBorder(rarity: string): string {
  return {
    common: "border-gray-600",
    rare: "border-blue-500",
    epic: "border-purple-500",
    legendary: "border-amber-400",
  }[rarity] ?? "border-gray-600";
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
}

export function qualityLabel(q: number): string {
  return ["Forgot it", "Very Hard", "Hard", "Good", "Easy", "Perfect!"][q] ?? "?";
}
