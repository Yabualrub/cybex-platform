"use client";

import { useEffect, useState } from "react";
import { getEntitlements, EntitlementsResponse } from "@/lib/api";

export function useEntitlements() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<EntitlementsResponse | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const res = await getEntitlements();
      setData(res);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load entitlements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, err, data, refresh };
}
