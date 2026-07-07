import { useCallback, useEffect, useState } from "react";

export function useElapsedTimer(active: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedSeconds(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  return {
    elapsedSeconds,
    resetElapsedSeconds: useCallback(() => setElapsedSeconds(0), [])
  };
}
