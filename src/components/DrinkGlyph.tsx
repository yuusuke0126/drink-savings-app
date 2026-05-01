"use client";

import { getDrinkEmoji } from "@/lib/drinkShared";

const SHOCHU_ICON = "/icons/shochu.png";

type DrinkGlyphProps = {
  drinkType: string;
  className?: string;
};

/**
 * Drink symbol: custom PNG for shochu, Unicode emoji for other types.
 */
export function DrinkGlyph({ drinkType, className = "" }: DrinkGlyphProps) {
  if (drinkType === "shochu") {
    return (
      <img
        src={SHOCHU_ICON}
        alt=""
        width={16}
        height={16}
        className={`inline-block h-[1.1em] w-[1.1em] shrink-0 align-[-0.12em] object-contain ${className}`}
        decoding="async"
      />
    );
  }
  return (
    <span className={`inline-block align-[-0.05em] ${className}`}>
      {getDrinkEmoji(drinkType)}
    </span>
  );
}
