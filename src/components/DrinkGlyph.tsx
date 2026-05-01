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
    // Match emoji line box and vertical-align so inline breakdown aligns with Unicode glyphs.
    return (
      <span
        className={`inline-flex h-[1em] w-[1em] shrink-0 items-center justify-center align-[-0.05em] ${className}`}
      >
        <img
          src={SHOCHU_ICON}
          alt=""
          width={20}
          height={20}
          className="pointer-events-none h-[1em] w-[1em] max-w-none object-contain"
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
