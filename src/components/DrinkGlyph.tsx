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
    // Slightly larger than 1em emoji box for legibility; align-* tuned for inline breakdown rows.
    return (
      <span
        className={`inline-flex h-[1.3em] w-[1.3em] shrink-0 items-center justify-center align-[-0.1em] ${className}`}
      >
        <img
          src={SHOCHU_ICON}
          alt=""
          width={26}
          height={26}
          className="pointer-events-none h-[1.3em] w-[1.3em] max-w-none object-contain"
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
