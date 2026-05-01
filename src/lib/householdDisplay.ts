import type { DrinkLog } from "./drinkShared";
import { MEMBER_COLOR_CLASSES } from "./drinkShared";
import type { HouseholdUserProfile } from "./drinkShared";

export function formatMemberDisplayLabel(
  memberUserId: string,
  profileMap: Record<string, HouseholdUserProfile | undefined>,
  selfUserId: string | undefined,
): string {
  const configuredName = profileMap[memberUserId]?.display_name?.trim();
  if (memberUserId === selfUserId) {
    if (configuredName) return `自分 (${configuredName})`;
    return "自分";
  }
  if (configuredName) return configuredName;
  return `メンバー (${memberUserId.slice(0, 8)})`;
}

/** Dedupe and sort: self first when present, then alphabetical. */
export function sortMemberIdsSelfFirst(
  memberIds: string[],
  logUserIds: string[],
  selfUserId: string | undefined,
): string[] {
  const ids = new Set<string>([...memberIds, ...logUserIds]);
  if (selfUserId) ids.add(selfUserId);
  return Array.from(ids).sort((a, b) => {
    if (!selfUserId) return a.localeCompare(b);
    if (a === selfUserId) return -1;
    if (b === selfUserId) return 1;
    return a.localeCompare(b);
  });
}

export function buildMemberColorClassMap(
  orderedMemberIds: string[],
): Map<string, string> {
  const colorMap = new Map<string, string>();
  orderedMemberIds.forEach((memberId, index) => {
    colorMap.set(
      memberId,
      MEMBER_COLOR_CLASSES[index % MEMBER_COLOR_CLASSES.length],
    );
  });
  return colorMap;
}

/** User ids needed to fetch profiles for visible logs + household roster. */
export function unionUserIdsForProfileFetch(
  selfId: string,
  householdMemberIds: string[],
  logLists: DrinkLog[][],
): string[] {
  const set = new Set<string>(householdMemberIds);
  for (const logs of logLists) {
    for (const log of logs) {
      set.add(log.user_id);
    }
  }
  set.add(selfId);
  return Array.from(set);
}
