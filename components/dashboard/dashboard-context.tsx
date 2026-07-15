'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

export type Range = '24h' | '7d' | '30d';
const Ctx = createContext<{ range: Range; setRange: (r: Range) => void }>({ range: '7d', setRange: () => {} });
export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<Range>('7d');
  return <Ctx.Provider value={{ range, setRange }}>{children}</Ctx.Provider>;
}
export const useRange = () => useContext(Ctx);
