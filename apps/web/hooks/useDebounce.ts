import { useState, useEffect } from "react";

/**
 * useDebounce hook delays updating a value until after delay ms has elapsed
 * since the last time the value changed. Prevents re-filtering / re-querying on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
