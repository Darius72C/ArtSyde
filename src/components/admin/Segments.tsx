"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { SPRING } from "@/lib/motion";

export type Segment = { href: string; label: string; count?: number; active: boolean };

/**
 * The shop's pill segment (Shop, LoginView), as links: the choice lives in the URL,
 * so the page can be shared and reloaded. The pill slides to the new choice.
 */
export function Segments({ items, label, id }: { items: Segment[]; label: string; id: string }) {
  return (
    <LayoutGroup id={id}>
      <nav aria-label={label} className="w-fit max-w-full overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-surface p-1">
        <ul className="flex">
          {items.map((s) => (
            <li key={s.href} className="shrink-0">
              <Link href={s.href} scroll={false} aria-current={s.active ? "page" : undefined} className="relative block rounded-full px-4 py-1.5 text-[14px]">
                {s.active && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={SPRING.snappy} />}
                <span className={`relative whitespace-nowrap ${s.active ? "font-medium" : "text-muted"}`}>
                  {s.label}
                  {s.count !== undefined && <span className="ml-1.5 tabular-nums text-muted">{s.count}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </LayoutGroup>
  );
}
