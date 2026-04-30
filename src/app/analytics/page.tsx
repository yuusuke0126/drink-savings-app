"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

type DrinkLog = {
  id: string;
  user_id: string;
  household_id: string;
  drink_type: string;
  custom_drink_name: string | null;
  created_at: string;
};

type UserProfile = {
  user_id: string;
  display_name: string | null;
};

const SAVINGS_PER_DRINK = 500;

function getDrinkEmoji(drinkType: string) {
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

function getDrinkLabel(drinkType: string) {
  const labelMap: Record<string, string> = {
    beer: "ビール",
    whisky: "ウイスキー",
    wine: "ワイン",
    sake: "日本酒",
    shochu: "焼酎",
    other: "その他",
  };
  return labelMap[drinkType] ?? drinkType;
}

function formatMonthInput(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState("");
  const [monthInput, setMonthInput] = useState(formatMonthInput(new Date()));
  const [selectedUserId, setSelectedUserId] = useState("");
  const [monthLogs, setMonthLogs] = useState<DrinkLog[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({});
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
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
        setMonthLogs([]);
        setProfileMap({});
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("default_household_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(`プロフィール取得エラー: ${error.message}`);
        return;
      }
      setHouseholdId(data?.default_household_id ?? "");
      setSelectedUserId(user.id);
    };

    void loadProfile();
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId || !monthInput) return;
    const [yearText, monthText] = monthInput.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) return;

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);

    const loadMonthLogs = async () => {
      const { data, error } = await supabase
        .from("drink_logs")
        .select("id,user_id,household_id,drink_type,custom_drink_name,created_at")
        .eq("household_id", householdId)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(`集計データ取得エラー: ${error.message}`);
        return;
      }
      setMonthLogs((data as DrinkLog[]) ?? []);
    };

    void loadMonthLogs();
  }, [householdId, monthInput, supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;
    const userIds = Array.from(new Set(monthLogs.map((log) => log.user_id)));
    if (!userIds.includes(user.id)) userIds.push(user.id);
    if (userIds.length === 0) return;

    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id,display_name")
        .in("user_id", userIds);

      if (error) {
        setMessage(`表示名取得エラー: ${error.message}`);
        return;
      }
      const nextMap: Record<string, UserProfile> = {};
      for (const profile of (data as UserProfile[]) ?? []) {
        nextMap[profile.user_id] = profile;
      }
      setProfileMap(nextMap);
    };

    void loadProfiles();
  }, [householdId, monthLogs, supabase, user]);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 2800);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const memberOptions = useMemo(() => {
    const userIds = Array.from(new Set(monthLogs.map((log) => log.user_id)));
    if (user?.id && !userIds.includes(user.id)) userIds.unshift(user.id);
    return userIds.sort((a, b) => {
      if (!user) return a.localeCompare(b);
      if (a === user.id) return -1;
      if (b === user.id) return 1;
      return a.localeCompare(b);
    });
  }, [monthLogs, user]);

  const formatMemberName = (memberUserId: string) => {
    const configuredName = profileMap[memberUserId]?.display_name?.trim();
    if (memberUserId === user?.id) {
      if (configuredName) return `自分 (${configuredName})`;
      return "自分";
    }
    if (configuredName) return configuredName;
    return `メンバー (${memberUserId.slice(0, 8)})`;
  };

  const selectedUserLogs = useMemo(
    () => monthLogs.filter((log) => log.user_id === selectedUserId),
    [monthLogs, selectedUserId],
  );

  const drinkBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of selectedUserLogs) {
      map.set(log.drink_type, (map.get(log.drink_type) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [selectedUserLogs]);

  if (isLoading) return <main className="p-6">読み込み中...</main>;

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
        <p className="rounded border p-4 text-sm">集計詳細を見るには先にログインしてください。</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded border px-3 py-2 text-sm text-slate-700"
        >
          ホームへ戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <section className="sticky top-0 z-30 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            ← ホーム
          </Link>
          <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            集計詳細
          </h1>
          <span className="text-xs text-slate-600 dark:text-slate-300">酒別内訳</span>
        </div>
      </section>

      <section className="rounded border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              対象ユーザー
            </label>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              {memberOptions.map((memberUserId) => (
                <option key={memberUserId} value={memberUserId}>
                  {formatMemberName(memberUserId)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              対象月
            </label>
            <input
              type="month"
              value={monthInput}
              onChange={(event) => setMonthInput(event.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-3 font-semibold text-slate-800">今月の酒別内訳</h2>
        {drinkBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">この条件の記録はありません。</p>
        ) : (
          <div className="space-y-2">
            {drinkBreakdown.map(([drinkType, count]) => (
              <div
                key={drinkType}
                className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-700">
                  {getDrinkEmoji(drinkType)} {getDrinkLabel(drinkType)}
                </span>
                <span className="text-sm text-slate-700">
                  {count}杯 / ¥{(count * SAVINGS_PER_DRINK).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {message && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2">
          <p
            className={`rounded-xl border p-3 text-sm shadow-lg backdrop-blur-sm transition-opacity ${
              message.includes("失敗") || message.includes("エラー")
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
          </p>
        </div>
      )}
    </main>
  );
}
