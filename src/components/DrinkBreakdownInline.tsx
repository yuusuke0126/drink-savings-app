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
  maxParts = 4,
  className = "",
}: DrinkBreakdownInlineProps) {
  const { rows, truncated } = getDrinkBreakdownRows(breakdown, maxParts);
  if (rows.length === 0) return null;
  return (
    <span className={className}>
      {rows.map(({ drinkType, count }, i) => (
        <span key={drinkType} className="whitespace-nowrap">
          {i > 0 ? " " : ""}
          <DrinkGlyph drinkType={drinkType} />
          {count}
        </span>
      ))}
      {truncated ? " …" : ""}
    </span>
  );
}
