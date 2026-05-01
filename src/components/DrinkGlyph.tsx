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
    // PNG often has generous transparent margins; size here is larger than other glyphs.
    // For a tighter icon, crop the source in an image editor instead of shrinking in CSS.
    return (
      <span
        className={`relative inline-flex h-[1.2em] w-[1.2em] shrink-0 items-center justify-center align-[-0.14em] ${className}`}
      >
        <img
          src={SHOCHU_ICON}
          alt=""
          width={28}
          height={28}
          className="pointer-events-none h-[1.85em] w-[1.85em] max-w-none object-contain"
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
