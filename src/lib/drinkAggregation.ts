import {
  DRINK_ORDER,
  createZeroDrinkBreakdownMap,
  type DrinkLog,
  type DrinkType,
} from "./drinkShared";

export type UserDrinkAggregate = {
  count: number;
  breakdown: Map<DrinkType, number>;
};

/** Per-user cup counts and drink-type breakdown from a log slice. */
export function aggregateDrinkLogsByUser(
  logs: DrinkLog[],
  memberIds: string[],
): Map<string, UserDrinkAggregate> {
  const map = new Map<string, UserDrinkAggregate>();
  for (const memberId of memberIds) {
    map.set(memberId, {
      count: 0,
      breakdown: createZeroDrinkBreakdownMap(),
    });
  }

  for (const log of logs) {
    let stat = map.get(log.user_id);
    if (!stat) {
      stat = { count: 0, breakdown: createZeroDrinkBreakdownMap() };
    }
    const drinkType = log.drink_type as DrinkType;
    stat.count += 1;
    if (DRINK_ORDER.has(drinkType)) {
      stat.breakdown.set(
        drinkType,
        (stat.breakdown.get(drinkType) ?? 0) + 1,
      );
    }
    map.set(log.user_id, stat);
  }
  return map;
}

/** For each calendar date in `monthLogs`, member ids present (sorted for stable marker order). */
export function buildCalendarSortedMarkersByDate(
  monthLogs: DrinkLog[],
  sortedMemberIds: string[],
): Map<string, string[]> {
  const raw = new Map<string, Set<string>>();
  for (const log of monthLogs) {
    const key = log.drank_on;
    const set = raw.get(key) ?? new Set<string>();
    set.add(log.user_id);
    raw.set(key, set);
  }

  const memberOrder = new Map(
    sortedMemberIds.map((id, index) => [id, index] as const),
  );

  const result = new Map<string, string[]>();
  for (const [dateKey, memberSet] of raw.entries()) {
    const ids = Array.from(memberSet);
    ids.sort((a, b) => {
      const ai = memberOrder.get(a) ?? -1;
      const bi = memberOrder.get(b) ?? -1;
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    result.set(dateKey, ids);
  }
  return result;
}

export function buildCalendarGridCells(
  year: number,
  monthIndex0: number,
): Array<number | null> {
  const firstDay = new Date(year, monthIndex0, 1).getDay();
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export type SelectedDayMemberStat = {
  memberId: string;
  count: number;
  amount: number;
  drinkBreakdown: Map<DrinkType, number> | undefined;
};

export function computeSelectedDayMemberStats(options: {
  monthLogs: DrinkLog[];
  activeCalendarDateKey: string;
  sortedMemberIds: string[];
  selfUserId: string | undefined;
  savingsPerDrink: number;
}): SelectedDayMemberStat[] {
  const {
    monthLogs,
    activeCalendarDateKey,
    sortedMemberIds,
    selfUserId,
    savingsPerDrink,
  } = options;

  if (sortedMemberIds.length === 0) return [];

  const countMap = new Map<string, number>();
  const breakdownMap = new Map<string, Map<DrinkType, number>>();

  for (const memberId of sortedMemberIds) {
    countMap.set(memberId, 0);
    breakdownMap.set(memberId, createZeroDrinkBreakdownMap());
  }

  for (const log of monthLogs) {
    if (log.drank_on !== activeCalendarDateKey) continue;
    if (!countMap.has(log.user_id)) continue;
    countMap.set(log.user_id, (countMap.get(log.user_id) ?? 0) + 1);
    const memberDrinkMap = breakdownMap.get(log.user_id);
    if (!memberDrinkMap) continue;
    const drinkType = log.drink_type as DrinkType;
    if (!DRINK_ORDER.has(drinkType)) continue;
    memberDrinkMap.set(drinkType, (memberDrinkMap.get(drinkType) ?? 0) + 1);
  }

  return sortedMemberIds.map((memberId) => {
    const count = countMap.get(memberId) ?? 0;
    const memberDrinkMap =
      breakdownMap.get(memberId) ?? createZeroDrinkBreakdownMap();
    return {
      memberId,
      count,
      amount: count * savingsPerDrink,
      drinkBreakdown:
        selfUserId && memberId === selfUserId ? memberDrinkMap : undefined,
    };
  });
}
