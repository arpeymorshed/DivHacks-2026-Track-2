"use client";
// Live demo state for both pages: GET /api/state on load, after every action (call refresh()), and a
// gentle poll while the tab is visible (each call reads balances from the ledger, so keep it slow).
import { useCallback, useEffect, useState } from "react";
import { api, errorText, type State } from "./api";

export function useDemoState(pollMs = 8000) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await api.state());
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { state, error, refresh };
}
