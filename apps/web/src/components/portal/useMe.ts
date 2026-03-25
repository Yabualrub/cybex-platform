"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";

export function useMe() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await getMe();
        if (alive) setMe(data);
      } catch {
        // تجاهل هون (الصفحات نفسها بتتعامل مع UNAUTHORIZED)
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { me, loading };
}
