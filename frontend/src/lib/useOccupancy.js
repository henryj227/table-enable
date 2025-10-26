import { useEffect, useRef, useState } from "react";
import { getOccupancy } from "./api";

/**
 * Polls occupancy every `intervalMs` and returns {data, loading, error}.
 */
export function useOccupancy(roomId, intervalMs = 3000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const d = await getOccupancy(roomId);
        if (!cancelled) {
          setData(d);
          setLoading(false);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }
    }

    tick();
    timer.current = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [roomId, intervalMs]);
  return { data, loading, error };
}

