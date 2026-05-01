"use client";

import { getDrinkEmoji } from "@/lib/drinkShared";

const SHOCHU_ICON = "/icons/shochu.png";

/** Box matches OS emoji scale even when parent font is ~11px (text-[11px] breakdown rows). */
const SHOCHU_INLINE_BOX_CLASS =
  "inline-flex h-[max(1.75em,1.35rem)] w-[max(1.75em,1.35rem)] shrink-0 items-center justify-center align-[-0.14em]";
const SHOCHU_IMG_SIZE_CLASS =
  "pointer-events-none h-[max(1.75em,1.35rem)] w-[max(1.75em,1.35rem)] max-w-none object-contain";

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
      <span className={`${SHOCHU_INLINE_BOX_CLASS} ${className}`}>
        <img
          src={SHOCHU_ICON}
          alt=""
          width={32}
          height={32}
          className={SHOCHU_IMG_SIZE_CLASS}
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
