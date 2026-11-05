import Link from "next/link";
import { external, type AdBanner } from "@/lib/ad";

/**
 * The home page's ad banner: a fixed-size horizontal strip (140 px high on phones, 180 px from tablets), the
 * shop's width. The image fills it (cropped to fit, the middle kept); the words and button sit on its left
 * and right. The whole strip is the link. Also the admin's preview, so both look the same.
 */
export function AdStrip({ ad, preview = false }: { ad: AdBanner; preview?: boolean }) {
  const light = ad.tone !== "dark";
  const ink = light ? "text-white" : "text-[#1d1d1f]";
  const inner = (
    <div className="group relative h-[140px] overflow-hidden rounded-[22px] bg-surface sm:h-[180px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- R2's public domain is set per deployment */}
      <img src={ad.image} alt={ad.title ?? ""} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      {(ad.title || ad.text) && <div aria-hidden className={`absolute inset-0 ${light ? "bg-gradient-to-r from-black/60 via-black/20 to-transparent" : "bg-gradient-to-r from-white/70 via-white/25 to-transparent"}`} />}
      <div className="relative flex h-full items-center justify-between gap-4 px-5 sm:px-10">
        <div className={`min-w-0 max-w-[60%] ${ink}`}>
          {ad.title && <p className="display line-clamp-2 text-[19px] leading-tight sm:text-[30px]">{ad.title}</p>}
          {ad.text && <p className={`mt-1 line-clamp-2 text-[13px] sm:mt-2 sm:text-[16px] ${light ? "text-white/85" : "text-[#1d1d1f]/75"}`}>{ad.text}</p>}
        </div>
        {ad.button && ad.url && (
          <span className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-transform duration-300 group-hover:scale-105 sm:px-6 sm:py-3 sm:text-[15px] ${light ? "bg-white text-[#1d1d1f]" : "bg-[#1d1d1f] text-white"}`}>{ad.button}</span>
        )}
      </div>
    </div>
  );

  const wrap = (children: React.ReactNode) => (preview ? <div>{children}</div> : <section aria-label="Annonce" className="mx-auto max-w-[1180px] px-5 py-10">{children}</section>);
  if (!ad.url || preview) return wrap(inner);
  return wrap(
    external(ad.url) ? (
      <a href={ad.url} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    ) : (
      <Link href={ad.url} className="block">
        {inner}
      </Link>
    ),
  );
}
