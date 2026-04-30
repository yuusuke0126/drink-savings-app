"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
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

type UserProfile = {
  user_id: string;
  default_household_id: string | null;
  display_name: string | null;
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
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const MEMBER_COLOR_CLASSES = [
  "bg-red-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-pink-500",
];
const SECTION_CARD_CLASS =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40";
const OUTLINE_BUTTON_CLASS =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
const CHIP_BUTTON_CLASS =
  "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";

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

function getDrinkDisplayName(drinkType: DrinkType, customDrinkName?: string) {
  if (drinkType === "other" && customDrinkName?.trim()) {
    return `その他 (${customDrinkName.trim()})`;
  }
  const found = DRINKS.find((d) => d.key === drinkType);
  return found?.label ?? drinkType;
}

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

function toDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logs, setLogs] = useState<DrinkLog[]>([]);
  const [calendarLogs, setCalendarLogs] = useState<DrinkLog[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtherInputOpen, setIsOtherInputOpen] = useState(false);
  const [otherDrinkName, setOtherDrinkName] = useState("");
  const [householdIdInput, setHouseholdIdInput] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [householdMemberIds, setHouseholdMemberIds] = useState<string[]>([]);
  const [isHouseholdSettingsOpen, setIsHouseholdSettingsOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({});
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
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
        setCalendarLogs([]);
        setHouseholdMemberIds([]);
        setProfileMap({});
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
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        setMessage(`履歴取得エラー: ${error.message}`);
        return;
      }
      setLogs((data as DrinkLog[]) ?? []);
    };

    void fetchLogs();
  }, [householdId, supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;

    const calendarMonth = new Date();
    calendarMonth.setMonth(calendarMonth.getMonth() + calendarMonthOffset);
    const monthStart = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const monthEnd = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    const fetchCalendarLogs = async () => {
      const { data, error } = await supabase
        .from("drink_logs")
        .select("id,user_id,household_id,drink_type,custom_drink_name,created_at")
        .eq("household_id", householdId)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(`カレンダー取得エラー: ${error.message}`);
        return;
      }
      setCalendarLogs((data as DrinkLog[]) ?? []);
    };

    void fetchCalendarLogs();
  }, [calendarMonthOffset, householdId, supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;

    const fetchHouseholdMembers = async () => {
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

    void fetchHouseholdMembers();
  }, [householdId, supabase, user]);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 2800);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

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

      const savedHouseholdId = data?.default_household_id ?? "";
      const ownDisplayName = data?.display_name ?? "";
      setHouseholdId(savedHouseholdId);
      setHouseholdIdInput(savedHouseholdId);
      setDisplayNameInput(ownDisplayName);
      setIsHouseholdSettingsOpen(!savedHouseholdId);
    };

    void loadProfile();
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase || !user || !householdId) return;

    const loadVisibleProfiles = async () => {
      const userIds = Array.from(
        new Set([
          ...householdMemberIds,
          ...logs.map((log) => log.user_id),
          ...calendarLogs.map((log) => log.user_id),
        ]),
      );
      if (!userIds.includes(user.id)) userIds.push(user.id);
      if (userIds.length === 0) return;

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

    void loadVisibleProfiles();
  }, [calendarLogs, householdId, householdMemberIds, logs, supabase, user]);

  const userStats = useMemo(() => {
    const todayTarget = new Date();
    todayTarget.setDate(todayTarget.getDate() + dayOffset);

    const monthTarget = new Date();
    monthTarget.setMonth(monthTarget.getMonth() + monthOffset);

    const map = new Map<string, { day: number; month: number }>();

    for (const memberId of householdMemberIds) {
      map.set(memberId, { day: 0, month: 0 });
    }

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
  }, [dayOffset, householdMemberIds, logs, monthOffset, user]);

  const dayLabel = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + dayOffset);
    return target.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  }, [dayOffset]);

  const monthLabel = useMemo(() => {
    const target = new Date();
    target.setMonth(target.getMonth() + monthOffset);
    return `${target.getFullYear()}年${target.getMonth() + 1}月`;
  }, [monthOffset]);

  const calendarMonthDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + calendarMonthOffset);
    return date;
  }, [calendarMonthOffset]);

  const calendarMonthLabel = useMemo(
    () =>
      `${calendarMonthDate.getFullYear()}年${calendarMonthDate.getMonth() + 1}月`,
    [calendarMonthDate],
  );

  const sortedMemberIds = useMemo(() => {
    const ids = Array.from(new Set(householdMemberIds));
    if (user?.id && !ids.includes(user.id)) ids.push(user.id);
    return ids.sort((a, b) => {
      if (!user) return a.localeCompare(b);
      if (a === user.id) return -1;
      if (b === user.id) return 1;
      return a.localeCompare(b);
    });
  }, [householdMemberIds, user]);

  const memberColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    sortedMemberIds.forEach((memberId, index) => {
      colorMap.set(memberId, MEMBER_COLOR_CLASSES[index % MEMBER_COLOR_CLASSES.length]);
    });
    return colorMap;
  }, [sortedMemberIds]);

  const calendarDateMarkers = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of calendarLogs) {
      const key = toDateKey(log.created_at);
      const current = map.get(key) ?? new Set<string>();
      current.add(log.user_id);
      map.set(key, current);
    }

    const sortedMap = new Map<string, string[]>();
    for (const [key, memberSet] of map.entries()) {
      const ids = Array.from(memberSet);
      ids.sort((a, b) => {
        const ai = sortedMemberIds.indexOf(a);
        const bi = sortedMemberIds.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      sortedMap.set(key, ids);
    }
    return sortedMap;
  }, [calendarLogs, sortedMemberIds]);

  const calendarGrid = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonthDate]);

  const defaultCalendarDateKey = useMemo(() => {
    const today = new Date();
    const monthDate = new Date(
      calendarMonthDate.getFullYear(),
      calendarMonthDate.getMonth(),
      1,
    );
    const selectedDefault = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      monthDate.getMonth() === today.getMonth() &&
        monthDate.getFullYear() === today.getFullYear()
        ? today.getDate()
        : 1,
    );
    return toDateKey(selectedDefault.toISOString());
  }, [calendarMonthDate]);

  const activeCalendarDateKey = useMemo(() => {
    const monthPrefix = `${calendarMonthDate.getFullYear()}-${`${calendarMonthDate.getMonth() + 1}`.padStart(2, "0")}-`;
    if (selectedCalendarDate.startsWith(monthPrefix)) {
      return selectedCalendarDate;
    }
    return defaultCalendarDateKey;
  }, [calendarMonthDate, defaultCalendarDateKey, selectedCalendarDate]);

  const selectedDayStats = useMemo(() => {
    if (sortedMemberIds.length === 0) return [];
    const drinkOrderMap = new Map<DrinkType, number>();
    DRINKS.forEach((drink, index) => {
      drinkOrderMap.set(drink.key, index);
    });

    const countMap = new Map<string, number>();
    const breakdownMap = new Map<string, Map<DrinkType, number>>();
    for (const memberId of sortedMemberIds) {
      countMap.set(memberId, 0);
      const memberDrinkMap = new Map<DrinkType, number>();
      DRINKS.forEach((drink) => {
        memberDrinkMap.set(drink.key, 0);
      });
      breakdownMap.set(memberId, memberDrinkMap);
    }

    for (const log of calendarLogs) {
      if (toDateKey(log.created_at) !== activeCalendarDateKey) continue;
      if (!countMap.has(log.user_id)) continue;
      countMap.set(log.user_id, (countMap.get(log.user_id) ?? 0) + 1);
      const memberDrinkMap = breakdownMap.get(log.user_id);
      if (!memberDrinkMap) continue;
      const drinkType = log.drink_type as DrinkType;
      if (!drinkOrderMap.has(drinkType)) continue;
      memberDrinkMap.set(drinkType, (memberDrinkMap.get(drinkType) ?? 0) + 1);
    }

    return sortedMemberIds.map((memberId) => {
      const count = countMap.get(memberId) ?? 0;
      const memberDrinkMap = breakdownMap.get(memberId) ?? new Map<DrinkType, number>();
      const breakdownParts = Array.from(memberDrinkMap.entries())
        .filter(([, value]) => value > 0)
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return (drinkOrderMap.get(a[0]) ?? 999) - (drinkOrderMap.get(b[0]) ?? 999);
        })
        .map(([drinkType, value]) => `${getDrinkEmoji(drinkType)}${value}`);
      const maxParts = 4;
      const breakdownText =
        breakdownParts.length > maxParts
          ? `${breakdownParts.slice(0, maxParts).join(" ")} …`
          : breakdownParts.join(" ");

      return {
        memberId,
        count,
        amount: count * SAVINGS_PER_DRINK,
        breakdownText,
      };
    });
  }, [activeCalendarDateKey, calendarLogs, sortedMemberIds]);

  const isDayNextDisabled = dayOffset >= 0;
  const isMonthNextDisabled = monthOffset >= 0;
  const isDayResetDisabled = dayOffset === 0;
  const isMonthResetDisabled = monthOffset === 0;

  const formatMemberName = (memberUserId: string) => {
    const configuredName = profileMap[memberUserId]?.display_name?.trim();
    if (memberUserId === user?.id) {
      if (configuredName) return `自分 (${configuredName})`;
      return "自分";
    }
    if (configuredName) return configuredName;
    return `メンバー (${memberUserId.slice(0, 8)})`;
  };

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
      const createdAt = (data as DrinkLog).created_at;
      setLogs((current) => [data as DrinkLog, ...current]);
      setMessage(
        `${getDrinkDisplayName(drinkType, customDrinkName)}を記録しました。${formatHistoryDate(createdAt)}`,
      );
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

  const handleSaveDisplayName = async () => {
    if (!supabase || !user) {
      setMessage("ログイン後に表示名を設定してください。");
      return;
    }

    const normalizedName = displayNameInput.trim();
    if (normalizedName.length < 1 || normalizedName.length > 20) {
      setMessage("表示名は1〜20文字で入力してください。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: normalizedName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      setMessage(`表示名保存失敗: ${error.message}`);
      setIsSubmitting(false);
      return;
    }

    setProfileMap((current) => ({
      ...current,
      [user.id]: {
        user_id: user.id,
        default_household_id: householdId || null,
        display_name: normalizedName,
      },
    }));
    setMessage("表示名を保存しました。");
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

  const displayNameText = displayNameInput.trim();
  const currentUserLabel = displayNameText || user?.email || "";
  const shouldUseHonorific = Boolean(displayNameText);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">飲酒記録アプリ</h1>
        {currentUserLabel && (
          <p className="text-xs text-slate-500">
            {shouldUseHonorific ? `${currentUserLabel}さん` : currentUserLabel}
          </p>
        )}
      </div>

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
        <section className={SECTION_CARD_CLASS}>
          <h2 className="mb-3 font-semibold">ログイン</h2>
          <form className="flex flex-col gap-3" onSubmit={handleSignIn}>
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={OUTLINE_BUTTON_CLASS}
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={OUTLINE_BUTTON_CLASS}
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
                className={OUTLINE_BUTTON_CLASS}
              >
                新規登録
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className={SECTION_CARD_CLASS}>
            <h2 className="mb-3 font-semibold">飲酒記録</h2>
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
                  } transition active:scale-95 active:bg-blue-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:active:bg-slate-700`}
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

          <section className={SECTION_CARD_CLASS}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">集計（人別）</h2>
              <Link
                href="/analytics"
                className={CHIP_BUTTON_CLASS}
              >
                集計詳細
              </Link>
            </div>

            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-900/20">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200">日付の飲酒量</h3>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setDayOffset((prev) => prev - 1)}
                    className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-slate-700 transition active:scale-95"
                  >
                    ←
                  </button>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{dayLabel}</span>
                  <button
                    onClick={() => setDayOffset(0)}
                    disabled={isDayResetDisabled}
                    className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    今日
                  </button>
                  <button
                    onClick={() => {
                      if (isDayNextDisabled) return;
                      setDayOffset((prev) => prev + 1);
                    }}
                    disabled={isDayNextDisabled}
                    className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-slate-700 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {userStats.map(([memberUserId, stat]) => (
                  <div
                    key={`day-${memberUserId}`}
                    className="rounded-lg border border-blue-100 bg-white/80 p-3 dark:border-blue-900/40 dark:bg-slate-800/60"
                  >
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-200">
                      {formatMemberName(memberUserId)}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.day}杯</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      ¥{(stat.day * SAVINGS_PER_DRINK).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/40 dark:bg-indigo-900/20">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-200">月の飲酒量</h3>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setMonthOffset((prev) => prev - 1)}
                    className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-slate-700 transition active:scale-95"
                  >
                    ←
                  </button>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{monthLabel}</span>
                  <button
                    onClick={() => setMonthOffset(0)}
                    disabled={isMonthResetDisabled}
                    className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    今月
                  </button>
                  <button
                    onClick={() => {
                      if (isMonthNextDisabled) return;
                      setMonthOffset((prev) => prev + 1);
                    }}
                    disabled={isMonthNextDisabled}
                    className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-slate-700 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {userStats.map(([memberUserId, stat]) => (
                  <div
                    key={`month-${memberUserId}`}
                    className="rounded-lg border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900/40 dark:bg-slate-800/60"
                  >
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                      {formatMemberName(memberUserId)}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.month}杯</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      ¥{(stat.month * SAVINGS_PER_DRINK).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {userStats.length === 0 && (
              <p className="mt-3 text-sm text-gray-600">まだ記録がありません。</p>
            )}
          </section>

          <section className={SECTION_CARD_CLASS}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">カレンダー</h2>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
                  className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-slate-700 transition active:scale-95"
                >
                  ←
                </button>
                <span className="font-medium text-slate-700 dark:text-slate-200">{calendarMonthLabel}</span>
                <button
                  onClick={() => setCalendarMonthOffset((prev) => prev + 1)}
                  className="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-slate-700 transition active:scale-95"
                >
                  →
                </button>
                <button
                  onClick={() => setCalendarMonthOffset(0)}
                  disabled={calendarMonthOffset === 0}
                  className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  今月
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-slate-600 dark:text-slate-300">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1 font-medium">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-12 rounded-md" />;
                }
                const dateKey = `${calendarMonthDate.getFullYear()}-${`${calendarMonthDate.getMonth() + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
                const marker = calendarDateMarkers.get(dateKey);
                const isSelected = dateKey === activeCalendarDateKey;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedCalendarDate(dateKey)}
                    className={`h-12 rounded-md border text-xs transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="text-slate-700 dark:text-slate-200">{day}</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      {(marker ?? []).slice(0, 3).map((memberId) => (
                        <span
                          key={`${dateKey}-${memberId}`}
                          className={`h-2 w-2 rounded-full ${memberColorMap.get(memberId) ?? "bg-slate-400"}`}
                        />
                      ))}
                      {(marker?.length ?? 0) > 3 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-300">
                          +{(marker?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {activeCalendarDateKey} のサマリー
              </p>
              {selectedDayStats.length === 0 ? (
                <p className="text-sm text-slate-500">この日の記録はありません。</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedDayStats.map((entry) => (
                    <div
                      key={`calendar-summary-${entry.memberId}`}
                      className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <p className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span>{formatMemberName(entry.memberId)}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${memberColorMap.get(entry.memberId) ?? "bg-slate-400"}`}
                        />
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {entry.count}杯
                        </span>
                        {" / "}
                        <span className="font-semibold">
                          ¥{entry.amount.toLocaleString()}
                        </span>
                        {entry.breakdownText && (
                          <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-300">
                            {entry.breakdownText}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={SECTION_CARD_CLASS}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">履歴</h2>
              <Link
                href="/history"
                className={CHIP_BUTTON_CLASS}
              >
                すべての履歴を見る
              </Link>
            </div>
            <ul className="space-y-2">
              {logs.length === 0 && (
                <li className="text-sm text-gray-600">まだ記録がありません。</li>
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
                      disabled={isSubmitting || log.user_id !== user.id}
                      className="shrink-0 whitespace-nowrap rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-700 dark:text-red-300"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={SECTION_CARD_CLASS}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">設定</h2>
              <button
                onClick={() =>
                  setIsHouseholdSettingsOpen((previous) => !previous)
                }
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {isHouseholdSettingsOpen ? "設定を閉じる" : "設定を開く"}
              </button>
            </div>
            {isHouseholdSettingsOpen ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-1 text-xs text-gray-600">
                    アカウント
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {user.email || "(未設定)"}
                    </p>
                    <button
                      onClick={handleSignOut}
                      className={OUTLINE_BUTTON_CLASS}
                    >
                      ログアウト
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-600">
                    表示名（1〜20文字）を設定します。
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="例: たろう"
                      maxLength={20}
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                    />
                    <button
                      onClick={handleSaveDisplayName}
                      disabled={isSubmitting}
                      className={OUTLINE_BUTTON_CLASS}
                    >
                      名前を保存
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-600">
                    household_id は通常1度設定すれば再入力不要です。必要なときだけ変更してください。
                  </p>
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
                      className={OUTLINE_BUTTON_CLASS}
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs text-gray-600">
                <p>現在の表示名: {displayNameInput.trim() || "(未設定)"}</p>
                <p>現在の household_id: {householdId || "(未設定)"}</p>
              </div>
            )}
          </section>
        </>
      )}

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
