"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

type DrinkType =
  | "beer"
  | "whisky"
  | "wine"
  | "sake"
  | "shochu"
  | "other";

type DrinkLog = {
  id: string;
  user_id: string;
  household_id: string;
  drink_type: string;
  custom_drink_name: string | null;
  created_at: string;
};

const DRINKS: { key: DrinkType; label: string }[] = [
  { key: "beer", label: "ビール" },
  { key: "whisky", label: "ウイスキー" },
  { key: "wine", label: "ワイン" },
  { key: "sake", label: "日本酒" },
  { key: "shochu", label: "焼酎" },
  { key: "other", label: "その他" },
];

const SAVINGS_PER_DRINK = 500;

function isSameDateInLocal(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

function isSameMonthInLocal(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth()
  );
}

function formatDrinkLabel(log: DrinkLog) {
  if (log.drink_type === "other" && log.custom_drink_name) {
    return `その他 (${log.custom_drink_name})`;
  }
  const found = DRINKS.find((d) => d.key === log.drink_type);
  return found?.label ?? log.drink_type;
}

function formatUserLabel(logUserId: string, currentUserId?: string) {
  if (currentUserId && logUserId === currentUserId) return "自分";
  return `共有メンバー (${logUserId.slice(0, 8)})`;
}

export default function Home() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logs, setLogs] = useState<DrinkLog[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtherInputOpen, setIsOtherInputOpen] = useState(false);
  const [otherDrinkName, setOtherDrinkName] = useState("");
  const [householdIdInput, setHouseholdIdInput] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [isHouseholdSettingsOpen, setIsHouseholdSettingsOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [message, setMessage] = useState(
    supabase
      ? ""
      : "Supabaseの環境変数が未設定です。.env.local を設定してください。",
  );

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
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("drink_logs")
        .select("id,user_id,household_id,drink_type,custom_drink_name,created_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(`履歴取得エラー: ${error.message}`);
        return;
      }
      setLogs((data as DrinkLog[]) ?? []);
    };

    void fetchLogs();
  }, [householdId, supabase, user]);

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

      const savedHouseholdId = data?.default_household_id ?? "";
      setHouseholdId(savedHouseholdId);
      setHouseholdIdInput(savedHouseholdId);
      setIsHouseholdSettingsOpen(!savedHouseholdId);
    };

    void loadProfile();
  }, [supabase, user]);

  const userStats = useMemo(() => {
    const todayTarget = new Date();
    todayTarget.setDate(todayTarget.getDate() + dayOffset);

    const monthTarget = new Date();
    monthTarget.setMonth(monthTarget.getMonth() + monthOffset);

    const map = new Map<string, { day: number; month: number }>();

    for (const log of logs) {
      const stat = map.get(log.user_id) ?? { day: 0, month: 0 };
      const createdAt = new Date(log.created_at);
      if (isSameDateInLocal(createdAt, todayTarget)) stat.day += 1;
      if (isSameMonthInLocal(createdAt, monthTarget)) stat.month += 1;
      map.set(log.user_id, stat);
    }

    return Array.from(map.entries()).sort(([a], [b]) => {
      if (!user) return a.localeCompare(b);
      if (a === user.id) return -1;
      if (b === user.id) return 1;
      return a.localeCompare(b);
    });
  }, [dayOffset, logs, monthOffset, user]);

  const dayLabel = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + dayOffset);
    return target.toLocaleDateString("ja-JP");
  }, [dayOffset]);

  const monthLabel = useMemo(() => {
    const target = new Date();
    target.setMonth(target.getMonth() + monthOffset);
    return `${target.getFullYear()}年${target.getMonth() + 1}月`;
  }, [monthOffset]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`ログイン失敗: ${error.message}`);
    } else {
      setMessage("ログインしました。");
      setEmail("");
      setPassword("");
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async () => {
    if (!supabase) return;
    setIsSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(`アカウント作成失敗: ${error.message}`);
    } else {
      setMessage("アカウント作成処理を実行しました。");
    }
    setIsSubmitting(false);
  };

  const handleAddDrink = async (
    drinkType: DrinkType,
    customDrinkName?: string,
  ) => {
    if (!supabase || !user) return;
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
    };

    const { data, error } = await supabase
      .from("drink_logs")
      .insert(payload)
      .select("id,user_id,household_id,drink_type,custom_drink_name,created_at")
      .single();

    if (error) {
      setMessage(`記録失敗: ${error.message}`);
    } else if (data) {
      setLogs((current) => [data as DrinkLog, ...current]);
      setMessage("1杯を記録しました。");
      if (drinkType === "other") {
        setOtherDrinkName("");
        setIsOtherInputOpen(false);
      }
    }
    setIsSubmitting(false);
  };

  const handleSaveHouseholdId = async () => {
    const normalized = householdIdInput.trim();
    if (!supabase || !user) {
      setMessage("ログイン後に household_id を設定してください。");
      return;
    }
    if (!normalized) {
      setMessage("household_id を入力してください。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { error: householdError } = await supabase
      .from("households")
      .upsert({ id: normalized, name: "shared-household" }, { onConflict: "id" });

    if (householdError) {
      setMessage(`household 作成/取得失敗: ${householdError.message}`);
      setIsSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("household_members")
      .upsert(
        {
          household_id: normalized,
          user_id: user.id,
        },
        { onConflict: "household_id,user_id" },
      );

    if (memberError) {
      setMessage(`household 参加失敗: ${memberError.message}`);
      setIsSubmitting(false);
      return;
    }

    setHouseholdId(normalized);
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          default_household_id: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      setMessage(`プロフィール保存失敗: ${profileError.message}`);
      setIsSubmitting(false);
      return;
    }

    setMessage("household_id を保存しました。");
    setIsHouseholdSettingsOpen(false);
    setIsSubmitting(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage("ログアウトしました。");
  };

  const handleDeleteLog = async (log: DrinkLog) => {
    if (!supabase) return;

    const confirmed = window.confirm("この記録を削除しますか？");
    if (!confirmed) return;

    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase
      .from("drink_logs")
      .delete()
      .eq("id", log.id);

    if (error) {
      setMessage(`削除失敗: ${error.message}`);
    } else {
      setLogs((current) => current.filter((item) => item.id !== log.id));
      setMessage("記録を削除しました。");
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return <main className="p-6">読み込み中...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">飲酒記録アプリ</h1>

      {!supabase && (
        <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            Supabase環境変数が未設定です。`.env.local` に
            `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`
            を設定してください。
          </p>
        </section>
      )}

      {!user ? (
        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">ログイン</h2>
          <form className="flex flex-col gap-3" onSubmit={handleSignIn}>
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border px-3 py-2"
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !supabase}
                className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
              >
                ログイン
              </button>
              <button
                type="button"
                disabled={isSubmitting || !supabase}
                onClick={handleSignUp}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                新規登録
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded border p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="rounded border px-3 py-1 text-sm"
              >
                ログアウト
              </button>
            </div>

            <h2 className="mb-3 font-semibold">1杯記録</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DRINKS.map((drink) => (
                <button
                  key={drink.key}
                  onClick={() => {
                    if (drink.key === "other") {
                      setIsOtherInputOpen((prev) => !prev);
                      return;
                    }
                    setIsOtherInputOpen(false);
                    void handleAddDrink(drink.key);
                  }}
                  disabled={isSubmitting || !householdId}
                  className={`rounded border px-3 py-2 text-sm ${
                    isOtherInputOpen && drink.key === "other"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300"
                  } transition active:scale-95 active:bg-blue-100 disabled:opacity-50`}
                >
                  {drink.label}
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
                  onClick={() => void handleAddDrink("other", otherDrinkName)}
                  disabled={isSubmitting || !householdId}
                  className="rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  記録
                </button>
              </div>
            )}
          </section>

          <section className="rounded border p-4">
            <h2 className="mb-3 font-semibold">集計（人別）</h2>
            <div className="mb-3 rounded border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">今日の飲酒量</h3>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setDayOffset((prev) => prev - 1)}
                    className="rounded border px-2 py-0.5 transition active:scale-95"
                  >
                    ←
                  </button>
                  <span>{dayLabel}</span>
                  <button
                    onClick={() => setDayOffset((prev) => prev + 1)}
                    className="rounded border px-2 py-0.5 transition active:scale-95"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">今月の飲酒量</h3>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setMonthOffset((prev) => prev - 1)}
                    className="rounded border px-2 py-0.5 transition active:scale-95"
                  >
                    ←
                  </button>
                  <span>{monthLabel}</span>
                  <button
                    onClick={() => setMonthOffset((prev) => prev + 1)}
                    className="rounded border px-2 py-0.5 transition active:scale-95"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {userStats.length === 0 && (
                <p className="text-sm text-gray-600">まだ記録がありません。</p>
              )}
              {userStats.map(([userId, stat]) => (
                <div key={userId} className="rounded border border-gray-200 p-3">
                  <p className="mb-1 text-sm font-semibold">
                    {formatUserLabel(userId, user?.id)}
                  </p>
                  <p className="text-sm text-gray-700">
                    今日: {stat.day}杯 / ¥
                    {(stat.day * SAVINGS_PER_DRINK).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    今月: {stat.month}杯 / ¥
                    {(stat.month * SAVINGS_PER_DRINK).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border p-4">
            <h2 className="mb-3 font-semibold">履歴</h2>
            <ul className="space-y-2">
              {logs.length === 0 && (
                <li className="text-sm text-gray-600">まだ記録がありません。</li>
              )}
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {formatDrinkLabel(log)}
                      {" · "}
                      {log.user_id === user.id ? "自分" : "共有メンバー"}
                    </span>
                    <button
                      onClick={() => handleDeleteLog(log)}
                      disabled={isSubmitting || log.user_id !== user.id}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      削除
                    </button>
                  </div>
                  <div className="mt-1 text-right text-gray-600">
                    {new Date(log.created_at).toLocaleString("ja-JP")}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">共有グループ設定</h2>
              <button
                onClick={() =>
                  setIsHouseholdSettingsOpen((previous) => !previous)
                }
                className="rounded border px-2 py-1 text-xs"
              >
                {isHouseholdSettingsOpen ? "設定を閉じる" : "設定を開く"}
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-600">
              household_id は通常1度設定すれば再入力不要です。必要なときだけ変更してください。
            </p>
            {isHouseholdSettingsOpen ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="例: 8f2b... (uuid)"
                  value={householdIdInput}
                  onChange={(e) => setHouseholdIdInput(e.target.value)}
                />
                <button
                  onClick={handleSaveHouseholdId}
                  disabled={isSubmitting}
                  className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-600">現在の household_id: {householdId || "(未設定)"}</p>
            )}
          </section>
        </>
      )}

      {message && (
        <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {message}
        </p>
      )}
    </main>
  );
}
