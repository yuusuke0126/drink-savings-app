"use client";

import type { DrinkType } from "@/lib/drinkShared";
import { getDrinkBreakdownRows } from "@/lib/drinkShared";
import { DrinkGlyph } from "@/components/DrinkGlyph";

type DrinkBreakdownInlineProps = {
  breakdown: Map<DrinkType, number>;
  maxParts?: number;
  className?: string;
};

export function DrinkBreakdownInline({
  breakdown,
  maxParts = 6,
  className = "",
}: DrinkBreakdownInlineProps) {
  const { rows, truncated } = getDrinkBreakdownRows(breakdown, maxParts);
  if (rows.length === 0) return null;
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}
    >
      {rows.map(({ drinkType, count }) => (
        <span
          key={drinkType}
          className="inline-flex items-center whitespace-nowrap"
        >
          <DrinkGlyph drinkType={drinkType} />
          {count}
        </span>
      ))}
      {truncated ? <span className="text-slate-400">…</span> : null}
    </span>
  );
}
