"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DrinkBreakdownInline } from "@/components/DrinkBreakdownInline";
import { useToastAutoDismiss } from "@/hooks/useToastAutoDismiss";
import { aggregateDrinkLogsByUser } from "@/lib/drinkAggregation";
import { getSupabaseClient } from "@/lib/supabase";
import {
  createZeroDrinkBreakdownMap,
  DRINK_LOG_SELECT_COLUMNS,
  DRINKS,
  DRINK_INPUT_TILE_ACCENT_CLASS,
  DRINK_INPUT_TILE_ICON_SRC,
  type DrinkLog,
  type DrinkType,
  type HouseholdUserProfile,
  formatHistoryDate,
  formatLocalYmd,
  getDrinkDisplayName,
  isErrorMessage,
  OUTLINE_BUTTON_CLASS,
  SECTION_CARD_CLASS,
  SAVINGS_PER_DRINK,
} from "@/lib/drinkShared";
import {
  buildMemberColorClassMap,
  formatMemberDisplayLabel,
  sortMemberIdsSelfFirst,
  unionUserIdsForProfileFetch,
} from "@/lib/householdDisplay";

function parseRouteDate(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return raw;
}

export default function DayLogPage() {
  const params = useParams();
  const rawDate = typeof params.date === "string" ? params.date : "";
  const dateKey = parseRouteDate(rawDate);

  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState("");
  const [householdMemberIds, setHouseholdMemberIds] = useState<string[]>([]);
  const [profileMap, setProfileMap] = useState<
    Record<string, HouseholdUserProfile>
  >({});
  const [dayLogs, setDayLogs] = useState<DrinkLog[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtherInputOpen, setIsOtherInputOpen] = useState(false);
  const [otherDrinkName, setOtherDrinkName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setHouseholdMemberIds([]);
        setProfileMap({});
        setDayLogs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id,default_household_id,display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(`プロフィール取得エラー: ${error.message}`);
        return;
      }

      setHouseholdId(data?.default_household_id ?? "");
    };

    void loadProfile();
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId || !dateKey) return;

    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);

      if (error) {
        setMessage(`メンバー取得エラー: ${error.message}`);
        return;
      }

      const ids = Array.from(
        new Set(
          ((data as { user_id: string }[] | null) ?? []).map((row) => row.user_id),
        ),
      );
      if (!ids.includes(user.id)) ids.push(user.id);
      setHouseholdMemberIds(ids);
    };

    void fetchMembers();
  }, [dateKey, householdId, supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId || !dateKey) return;

    const fetchDay = async () => {
      const { data, error } = await supabase
        .from("drink_logs")
        .select(DRINK_LOG_SELECT_COLUMNS)
        .eq("household_id", householdId)
        .eq("drank_on", dateKey)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(`記録取得エラー: ${error.message}`);
        return;
      }
      setDayLogs((data as DrinkLog[]) ?? []);
    };

    void fetchDay();
  }, [dateKey, householdId, supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId || !dateKey) return;
    if (householdMemberIds.length === 0 && dayLogs.length === 0) return;

    const loadProfiles = async () => {
      const userIds = unionUserIdsForProfileFetch(user.id, householdMemberIds, [
        dayLogs,
      ]);
      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id,default_household_id,display_name")
        .in("user_id", userIds);

      if (error) {
        setMessage(`表示名取得エラー: ${error.message}`);
        return;
      }

      const nextMap: Record<string, HouseholdUserProfile> = {};
      for (const profile of (data as HouseholdUserProfile[]) ?? []) {
        nextMap[profile.user_id] = profile;
      }
      setProfileMap(nextMap);
    };

    void loadProfiles();
  }, [dateKey, dayLogs, householdId, householdMemberIds, supabase, user]);

  useToastAutoDismiss(message, setMessage);

  const sortedMemberIds = useMemo(
    () =>
      sortMemberIdsSelfFirst(
        householdMemberIds,
        dayLogs.map((log) => log.user_id),
        user?.id,
      ),
    [dayLogs, householdMemberIds, user?.id],
  );

  const memberColorMap = useMemo(
    () => buildMemberColorClassMap(sortedMemberIds),
    [sortedMemberIds],
  );

  const dayStats = useMemo(() => {
    const byUser = aggregateDrinkLogsByUser(dayLogs, sortedMemberIds);
    return sortedMemberIds.map((memberId) => {
      const stat = byUser.get(memberId) ?? {
        count: 0,
        breakdown: createZeroDrinkBreakdownMap(),
      };
      return {
        memberId,
        count: stat.count,
        amount: stat.count * SAVINGS_PER_DRINK,
        drinkBreakdown:
          user && memberId === user.id ? stat.breakdown : undefined,
      };
    });
  }, [dayLogs, sortedMemberIds, user]);

  const todayYmd = formatLocalYmd(new Date());
  const canRecord =
    dateKey != null && Boolean(householdId) && dateKey <= todayYmd;

  const handleAddDrink = async (
    drinkType: DrinkType,
    customDrinkName?: string,
  ) => {
    if (!supabase || !user || !dateKey) return;
    if (!canRecord) {
      setMessage("この日付には記録できません。");
      return;
    }
    if (!householdId) {
      setMessage("先に household_id を設定してください。");
      return;
    }
    if (drinkType === "other" && !customDrinkName?.trim()) {
      setMessage("その他を選択した場合は飲み物名を入力してください。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const payload = {
      user_id: user.id,
      household_id: householdId,
      drink_type: drinkType,
      custom_drink_name:
        drinkType === "other" ? customDrinkName?.trim() ?? null : null,
      drank_on: dateKey,
    };

    const { data, error } = await supabase
      .from("drink_logs")
      .insert(payload)
      .select(DRINK_LOG_SELECT_COLUMNS)
      .single();

    if (error) {
      setMessage(`記録失敗: ${error.message}`);
    } else if (data) {
      const row = data as DrinkLog;
      setDayLogs((prev) => [row, ...prev]);
      setMessage(
        `${getDrinkDisplayName(drinkType, customDrinkName)}を記録しました。${formatHistoryDate(row.created_at)}`,
      );
      if (drinkType === "other") {
        setOtherDrinkName("");
        setIsOtherInputOpen(false);
      }
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <main className="p-6">読み込み中...</main>;
  }

  if (!dateKey) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm">
          日付が不正です。
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded border px-3 py-2 text-sm text-slate-700"
        >
          ホームへ戻る
        </Link>
      </main>
    );
  }

  if (!supabase) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase環境変数が未設定です。.env.local を設定してください。
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="rounded border p-4 text-sm">記録するには先にログインしてください。</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded border px-3 py-2 text-sm text-slate-700"
        >
          ホームへ戻る
        </Link>
      </main>
    );
  }

  const dateLabel = new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
  ).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className={OUTLINE_BUTTON_CLASS}
        >
          ← 戻る
        </Link>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {dateLabel}
        </h1>
        <span className="w-20 sm:w-24" aria-hidden />
      </header>

      {!householdId && (
        <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ホームで household_id を設定してください。
        </section>
      )}

      <section className={SECTION_CARD_CLASS}>
        <h2 className="mb-3 font-semibold">飲酒記録</h2>
        <div className="grid grid-cols-3 gap-2">
          {DRINKS.map((drink) => (
            <button
              key={drink.key}
              type="button"
              onClick={() => {
                if (drink.key === "other") {
                  setIsOtherInputOpen((prev) => !prev);
                  return;
                }
                setIsOtherInputOpen(false);
                void handleAddDrink(drink.key);
              }}
              disabled={isSubmitting || !householdId || !canRecord}
              className={`flex min-h-[5.75rem] flex-col overflow-hidden rounded-xl border shadow-sm transition active:scale-[0.98] disabled:opacity-50 dark:shadow-none ${
                isOtherInputOpen && drink.key === "other"
                  ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                  : "border-slate-200 bg-white active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:active:bg-slate-700/80"
              }`}
            >
              <span className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-slate-800 dark:text-slate-100">
                <img
                  src={DRINK_INPUT_TILE_ICON_SRC[drink.key]}
                  alt=""
                  width={44}
                  height={44}
                  className="pointer-events-none h-11 w-11 shrink-0 object-contain"
                  decoding="async"
                />
                <span className="max-w-full text-center text-[11px] font-medium leading-tight sm:text-xs">
                  {drink.label}
                </span>
              </span>
              <span
                className={`h-1 w-full shrink-0 ${DRINK_INPUT_TILE_ACCENT_CLASS[drink.key]}`}
                aria-hidden
              />
            </button>
          ))}
        </div>
        {isOtherInputOpen && (
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="飲み物名を入力"
              value={otherDrinkName}
              onChange={(e) => setOtherDrinkName(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void handleAddDrink("other", otherDrinkName)}
              disabled={isSubmitting || !householdId || !canRecord}
              className="rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              記録
            </button>
          </div>
        )}
        {!canRecord && dateKey > todayYmd && (
          <p className="mt-2 text-xs text-slate-500">未来の日付には記録できません。</p>
        )}
      </section>

      <section className={SECTION_CARD_CLASS}>
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-900/20">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200">
              日付の飲酒量
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {dayStats.map((entry) => (
              <div
                key={`day-${entry.memberId}`}
                className="rounded-lg border border-blue-100 bg-white/80 p-3 dark:border-blue-900/40 dark:bg-slate-800/60"
              >
                <p className="flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-200">
                  <span>
                    {formatMemberDisplayLabel(
                      entry.memberId,
                      profileMap,
                      user.id,
                    )}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${memberColorMap.get(entry.memberId) ?? "bg-slate-400"}`}
                  />
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {entry.count}杯
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  ¥{entry.amount.toLocaleString()}
                </p>
                {entry.drinkBreakdown && entry.count > 0 && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                    <DrinkBreakdownInline breakdown={entry.drinkBreakdown} />
                  </p>
                )}
              </div>
            ))}
          </div>
          {sortedMemberIds.length === 0 && (
            <p className="text-sm text-gray-600">世帯メンバーがまだいません。</p>
          )}
        </div>
      </section>

      {message && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2">
          <div
            className={`rounded-xl border p-3 text-sm shadow-lg backdrop-blur-sm transition-opacity ${
              isErrorMessage(message)
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            } pointer-events-auto`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="select-text whitespace-pre-wrap break-words">{message}</p>
              {isErrorMessage(message) && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(message);
                      } catch {
                        // no-op
                      }
                    }}
                    className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700"
                  >
                    コピー
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
