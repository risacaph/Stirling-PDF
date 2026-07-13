import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a callback with a stable identity across renders that always invokes the latest
 * version passed in. Useful for passing handlers into effect dependency arrays without
 * retriggering the effect on every render.
 */
export const useStableCallback = <T extends (...args: never[]) => unknown>(
  callback: T,
): T => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    [],
  );
};
