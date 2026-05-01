"use client";

import { useEffect } from "react";
import { isErrorMessage } from "@/lib/drinkShared";

/** Clears non-error toasts after `delayMs` (success-style messages). */
export function useToastAutoDismiss(
  message: string,
  setMessage: (value: string) => void,
  delayMs = 2800,
) {
  useEffect(() => {
    if (!message) return;
    if (isErrorMessage(message)) return;
    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [message, setMessage, delayMs]);
}
