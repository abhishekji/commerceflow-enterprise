import { useEffect, useRef } from "react";

/** Runs `task` immediately and then every `intervalMs` while mounted. Restarts when `deps` change. */
export function usePolling(task: () => void | Promise<unknown>, intervalMs: number, deps: unknown[] = []): void {
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    void taskRef.current();
    const timer = setInterval(() => void taskRef.current(), intervalMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
