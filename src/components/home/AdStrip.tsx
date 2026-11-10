import Link from "next/link";
import { external, type AdBanner } from "@/lib/ad";

/**
 * The ad banner. On phones the whole image shows at its 5:1 format, with the words and button under it, on the
 * tile (a strip tall enough for words would crop away more than half the image). From tablets: a 180 px strip the
 * shop's width, the image filling it, the words and button on top. The whole banner is the link. Also the admin's preview.
 */
export function AdStrip({ ad, preview = false }: { ad: AdBanner; preview?: boolean }) {
  const light = ad.tone !== "dark";
  const ink = light ? "text-ink sm:text-white" : "text-ink sm:text-[#1d1d1f]";
  const words = Boolean(ad.title || ad.text || (ad.button && ad.url));
  const inner = (
    <div className="group relative overflow-hidden rounded-[22px] bg-surface sm:h-[180px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- R2's public domain is set per deployment */}
      <img src={ad.image} alt={ad.title ?? ""} loading="lazy" decoding="async" className="block aspect-[5/1] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:absolute sm:inset-0 sm:aspect-auto sm:h-full" />
      {(ad.title || ad.text) && <div aria-hidden className={`absolute inset-0 hidden sm:block ${light ? "bg-gradient-to-r from-black/60 via-black/20 to-transparent" : "bg-gradient-to-r from-white/70 via-white/25 to-transparent"}`} />}
      {words && <div className="relative flex items-center justify-between gap-4 px-4 py-3 sm:h-full sm:px-10 sm:py-0">
        <div className={`min-w-0 sm:max-w-[60%] ${ink}`}>
          {ad.title && <p className="display line-clamp-2 text-[17px] leading-tight sm:text-[30px]">{ad.title}</p>}
          {ad.text && <p className={`mt-1 line-clamp-2 text-[13px] sm:mt-2 sm:text-[16px] ${light ? "text-muted sm:text-white/85" : "text-muted sm:text-[#1d1d1f]/75"}`}>{ad.text}</p>}
        </div>
        {ad.button && ad.url && (
          <span className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-transform duration-300 group-hover:scale-105 sm:px-6 sm:py-3 sm:text-[15px] ${light ? "bg-ink text-on-ink sm:bg-white sm:text-[#1d1d1f]" : "bg-ink text-on-ink sm:bg-[#1d1d1f] sm:text-white"}`}>{ad.button}</span>
        )}
      </div>}
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
