'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { EventDTO } from '@/lib/dto';

const Ctx = createContext<{ live: EventDTO[] }>({ live: [] });

export function LiveFeedProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<EventDTO[]>([]);
  const since = useRef<string>(new Date().toISOString());
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const r = await fetch(`/api/events?limit=25&since=${encodeURIComponent(since.current)}`);
        const j = await r.json();
        const items: EventDTO[] = j.items ?? [];
        if (items.length) {
          since.current = items[0].createdAt;
          setLive((prev) => [...items, ...prev].slice(0, 80));
        }
      } catch {}
      if (!stop) timer = setTimeout(poll, 4000);
    }
    timer = setTimeout(poll, 4000);
    return () => { stop = true; clearTimeout(timer); };
  }, []);
  return <Ctx.Provider value={{ live }}>{children}</Ctx.Provider>;
}
export const useLiveFeed = () => useContext(Ctx);
