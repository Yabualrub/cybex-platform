// src/lib/useMe.ts
"use client";

import { useEffect, useState } from "react";
import { getMe, Me } from "@/lib/api";

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await getMe();
      setMe(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { me, loading, refresh };
}
