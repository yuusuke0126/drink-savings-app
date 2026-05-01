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

export function isErrorMessage(text: string) {
  return text.includes("失敗") || text.includes("エラー");
}

/** Sorted breakdown rows for UI (e.g. inline icons + counts). */
export function getDrinkBreakdownRows(
  breakdownMap: Map<DrinkType, number>,
  maxParts = 4,
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
