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
  default_household_id: string | null;
  display_name: string | null;
};

const PAGE_SIZE = 20;

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

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function HistoryPage() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState("");
  const [logs, setLogs] = useState<DrinkLog[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isDeleting, setIsDeleting] = useState(false);
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
        setLogs([]);
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
    };

    void loadProfile();
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;

    const loadPage = async () => {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [{ data: logsData, error: logsError }, { count, error: countError }] =
        await Promise.all([
          supabase
            .from("drink_logs")
            .select("id,user_id,household_id,drink_type,custom_drink_name,created_at")
            .eq("household_id", householdId)
            .order("created_at", { ascending: false })
            .range(from, to),
          supabase
            .from("drink_logs")
            .select("*", { count: "exact", head: true })
            .eq("household_id", householdId),
        ]);

      if (logsError) {
        setMessage(`履歴取得エラー: ${logsError.message}`);
        return;
      }
      if (countError) {
        setMessage(`件数取得エラー: ${countError.message}`);
        return;
      }

      setLogs((logsData as DrinkLog[]) ?? []);
      setTotalCount(count ?? 0);
    };

    void loadPage();
  }, [householdId, pageIndex, supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;
    if (logs.length === 0) return;

    const loadProfiles = async () => {
      const userIds = Array.from(new Set(logs.map((log) => log.user_id)));
      if (!userIds.includes(user.id)) userIds.push(user.id);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id,default_household_id,display_name")
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
  }, [householdId, logs, supabase, user]);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 2800);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount],
  );

  const formatMemberName = (memberUserId: string) => {
    const configuredName = profileMap[memberUserId]?.display_name?.trim();
    if (memberUserId === user?.id) {
      if (configuredName) return `自分 (${configuredName})`;
      return "自分";
    }
    if (configuredName) return configuredName;
    return `メンバー (${memberUserId.slice(0, 8)})`;
  };

  const handleDeleteLog = async (log: DrinkLog) => {
    if (!supabase) return;
    const confirmed = window.confirm("この記録を削除しますか？");
    if (!confirmed) return;

    setIsDeleting(true);
    const { error } = await supabase.from("drink_logs").delete().eq("id", log.id);
    if (error) {
      setMessage(`削除失敗: ${error.message}`);
      setIsDeleting(false);
      return;
    }

    const nextTotal = Math.max(0, totalCount - 1);
    const nextMaxPage = Math.max(0, Math.ceil(nextTotal / PAGE_SIZE) - 1);
    setTotalCount(nextTotal);
    setPageIndex((current) => Math.min(current, nextMaxPage));
    setLogs((current) => current.filter((item) => item.id !== log.id));
    setMessage("記録を削除しました。");
    setIsDeleting(false);
  };

  if (isLoading) {
    return <main className="p-6">読み込み中...</main>;
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
        <p className="rounded border p-4 text-sm">履歴を見るには先にログインしてください。</p>
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
            履歴
          </h1>
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {pageIndex + 1} / {totalPages}
          </span>
        </div>
      </section>

      <section className="rounded border p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            直近順で20件ずつ表示
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={pageIndex === 0}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              前へ
            </button>
            <button
              onClick={() =>
                setPageIndex((prev) =>
                  prev + 1 < totalPages ? prev + 1 : prev,
                )
              }
              disabled={pageIndex + 1 >= totalPages}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              次へ
            </button>
          </div>
        </div>

        <ul className="space-y-2">
          {logs.length === 0 && (
            <li className="text-sm text-gray-600">履歴がありません。</li>
          )}
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-gray-800 dark:text-gray-100">
                  {getDrinkEmoji(log.drink_type)} {formatMemberName(log.user_id)} ·{" "}
                  {formatHistoryDate(log.created_at)}
                </span>
                <button
                  onClick={() => handleDeleteLog(log)}
                  disabled={isDeleting || log.user_id !== user.id}
                  className="shrink-0 whitespace-nowrap rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-700 dark:text-red-300"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
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
