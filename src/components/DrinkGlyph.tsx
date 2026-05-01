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
    // Larger than default emoji line height for legibility; align-* tuned for inline breakdown rows.
    return (
      <span
        className={`inline-flex h-[1.48em] w-[1.48em] shrink-0 items-center justify-center align-[-0.12em] ${className}`}
      >
        <img
          src={SHOCHU_ICON}
          alt=""
          width={30}
          height={30}
          className="pointer-events-none h-[1.48em] w-[1.48em] max-w-none object-contain"
          decoding="async"
        />
      </span>
    );
  }
  return (
    <span className={`inline-block align-[-0.05em] ${className}`}>
      {getDrinkEmoji(drinkType)}
    </span>
  );
}
