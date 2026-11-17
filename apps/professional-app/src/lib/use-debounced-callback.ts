import { useEffect, useRef } from "react";

/** Returns a function that runs `callback` once calls stop for `delayMs`. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A pending call must not fire after the component is gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  return (...args: Args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => callback(...args), delayMs);
  };
}
