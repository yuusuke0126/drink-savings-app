export type DrinkType =
  | "beer"
  | "whisky"
  | "wine"
  | "sake"
  | "shochu"
  | "other";

export type DrinkLog = {
  id: string;
  user_id: string;
  household_id: string;
  drink_type: string;
  custom_drink_name: string | null;
  drank_on: string;
  created_at: string;
};

export const DRINKS: { key: DrinkType; label: string }[] = [
  { key: "beer", label: "ビール" },
  { key: "whisky", label: "ウイスキー" },
  { key: "wine", label: "ワイン" },
  { key: "sake", label: "日本酒" },
  { key: "shochu", label: "焼酎" },
  { key: "other", label: "その他" },
];

export const DRINK_ORDER = new Map<DrinkType, number>(
  DRINKS.map((drink, index) => [drink.key, index]),
);

/** 128px PNG paths for drink input tiles on home / day pages only (not DrinkGlyph). */
export const DRINK_INPUT_TILE_ICON_SRC: Record<DrinkType, string> = {
  beer: "/icons/beer_128.png",
  whisky: "/icons/whisky_128.png",
  wine: "/icons/wine_128.png",
  sake: "/icons/sake_128.png",
  shochu: "/icons/shochu_128.png",
  other: "/icons/other_128.png",
};

/** Bottom accent strip for drink input tiles (home / day pages). */
export const DRINK_INPUT_TILE_ACCENT_CLASS: Record<DrinkType, string> = {
  beer: "bg-yellow-400 dark:bg-yellow-500",
  whisky: "bg-amber-800 dark:bg-amber-700",
  wine: "bg-red-600 dark:bg-red-500",
  sake: "bg-blue-600 dark:bg-blue-500",
  shochu: "bg-emerald-600 dark:bg-emerald-500",
  other: "bg-violet-600 dark:bg-violet-500",
};

export const SAVINGS_PER_DRINK = 500;

export const MEMBER_COLOR_CLASSES = [
  "bg-red-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-pink-500",
];

export const SECTION_CARD_CLASS =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40";
export const OUTLINE_BUTTON_CLASS =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
export const CHIP_BUTTON_CLASS =
  "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";

export function formatLocalYmd(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDrinkDisplayName(
  drinkType: DrinkType,
  customDrinkName?: string,
) {
  if (drinkType === "other" && customDrinkName?.trim()) {
    return `その他 (${customDrinkName.trim()})`;
  }
  const found = DRINKS.find((d) => d.key === drinkType);
  return found?.label ?? drinkType;
}

export function getDrinkEmoji(drinkType: string) {
  switch (drinkType) {
    case "beer":
      return "🍺";
    case "whisky":
      return "🥃";
    case "wine":
      return "🍷";
    case "sake":
      return "🍶";
    case "shochu":
      return "🍹";
    case "other":
      return "🍸";
    default:
      return "🍸";
  }
}

export function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const startOfLocalDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Log line: registration time; omit year if within one year before today (real local calendar). */
export function formatLogRegisteredAt(createdAt: string): string {
  const d = new Date(createdAt);
  const today = new Date();
  const oneYearAgoStart = startOfLocalDay(today);
  oneYearAgoStart.setFullYear(oneYearAgoStart.getFullYear() - 1);
  const needYear = d < oneYearAgoStart;
  return d.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(needYear ? { year: "numeric" } : {}),
  });
}

/** True when 飲酒日 differs from the local calendar day of registration (backdated entry). */
export function drankOnDiffersFromRegisteredDay(
  drankOn: string,
  createdAt: string,
): boolean {
  return drankOn !== formatLocalYmd(new Date(createdAt));
}

/** Compact date for （飲酒日：…）; omit year if drank_on is on/after the same rolling boundary as formatLogRegisteredAt. */
export function formatDrankOnLabel(drankOn: string): string {
  const parts = drankOn.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return drankOn;
  const dt = new Date(y, m - 1, day);
  const today = new Date();
  const oneYearAgoStart = startOfLocalDay(today);
  oneYearAgoStart.setFullYear(oneYearAgoStart.getFullYear() - 1);
  const needYear = dt < oneYearAgoStart;
  return dt.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    ...(needYear ? { year: "numeric" } : {}),
  });
}

export function isErrorMessage(text: string) {
  return text.includes("失敗") || text.includes("エラー");
}

/** Sorted breakdown rows for UI (e.g. inline icons + counts). */
export function getDrinkBreakdownRows(
  breakdownMap: Map<DrinkType, number>,
  maxParts = 6,
): { rows: { drinkType: DrinkType; count: number }[]; truncated: boolean } {
  const sorted = Array.from(breakdownMap.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (DRINK_ORDER.get(a[0]) ?? 999) - (DRINK_ORDER.get(b[0]) ?? 999);
    });
  const truncated = sorted.length > maxParts;
  const rows = sorted
    .slice(0, maxParts)
    .map(([drinkType, count]) => ({ drinkType, count }));
  return { rows, truncated };
}

export function logInCalendarMonth(
  drankOn: string,
  calendarMonthDate: Date,
) {
  const monthStartStr = formatLocalYmd(
    new Date(
      calendarMonthDate.getFullYear(),
      calendarMonthDate.getMonth(),
      1,
    ),
  );
  const monthEndStr = formatLocalYmd(
    new Date(
      calendarMonthDate.getFullYear(),
      calendarMonthDate.getMonth() + 1,
      1,
    ),
  );
  return drankOn >= monthStartStr && drankOn < monthEndStr;
}
