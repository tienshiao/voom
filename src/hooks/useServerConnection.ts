import { useState, useEffect, useRef, useCallback } from "react";

export type ConnectionStatus = "connected" | "disconnected" | "hash-mismatch";

interface UseServerConnectionOptions {
  enabled?: boolean;
  pollInterval?: number;
  timeout?: number;
}

interface UseServerConnectionResult {
  status: ConnectionStatus;
  isConnected: boolean;
  lastError: string | null;
}

export function useServerConnection(
  initialHash: string | null,
  options: UseServerConnectionOptions = {}
): UseServerConnectionResult {
  const { enabled = true, pollInterval = 10000, timeout = 5000 } = options;

  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const [lastError, setLastError] = useState<string | null>(null);
  const hashRef = useRef(initialHash);

  // Update ref when initialHash changes
  useEffect(() => {
    hashRef.current = initialHash;
  }, [initialHash]);

  const checkConnection = useCallback(async () => {
    if (!hashRef.current) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch("/api/status", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        setStatus("disconnected");
        setLastError(`Server returned ${res.status}`);
        return;
      }

      const data = await res.json();

      if (data.hash !== hashRef.current) {
        setStatus("hash-mismatch");
        setLastError("Diff has changed");
      } else {
        setStatus("connected");
        setLastError(null);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setStatus("disconnected");
      setLastError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [timeout]);

  useEffect(() => {
    if (!enabled || !initialHash) return;

    // Run initial check
    checkConnection();

    // Set up polling
    const intervalId = setInterval(checkConnection, pollInterval);

    return () => clearInterval(intervalId);
  }, [enabled, initialHash, pollInterval, checkConnection]);

  return {
    status,
    isConnected: status === "connected",
    lastError,
  };
}
