"use client";

import { useState, type ReactNode } from "react";
import { LayoutGroup, motion } from "motion/react";
import { SPRING } from "@/lib/motion";

/** A product's pictures in tabs: Photos · Mockup · 3D. Each panel stays mounted once opened (the 3D keeps its state). */
export function MediaTabs({ tabs }: { tabs: { id: string; label: string; count?: number; panel: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const [opened, setOpened] = useState(() => new Set([tabs[0].id]));
  const open = (id: string) => {
    setActive(id);
    setOpened((s) => (s.has(id) ? s : new Set(s).add(id)));
  };

  return (
    <div>
      <LayoutGroup id="media-tabs">
        <div className="flex w-fit rounded-full bg-surface p-1" role="tablist" aria-label="Images du modèle">
          {tabs.map((t) => (
            <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={active === t.id} aria-controls={`panel-${t.id}`} onClick={() => open(t.id)} className="relative rounded-full px-4 py-1.5 text-[14px]">
              {active === t.id && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={SPRING.snappy} />}
              <span className={`relative whitespace-nowrap ${active === t.id ? "font-medium" : "text-muted"}`}>
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 tabular-nums text-muted">{t.count}</span>}
              </span>
            </button>
          ))}
        </div>
      </LayoutGroup>
      {tabs.map((t) =>
        opened.has(t.id) ? (
          <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="mt-8">
            {t.panel}
          </div>
        ) : null,
      )}
    </div>
  );
}
