import { COMPANY } from "@/lib/company";

/** WhatsApp's logo. */
export function WhatsAppMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.004 3C9.38 3 3.99 8.39 3.99 15.01c0 2.12.55 4.18 1.6 6l-1.7 6.2 6.35-1.67a12 12 0 0 0 5.76 1.47h.01c6.62 0 12.01-5.39 12.01-12.01S22.63 3 16.004 3zm0 21.97h-.01a9.95 9.95 0 0 1-5.08-1.39l-.36-.22-3.77.99 1-3.67-.24-.38a9.93 9.93 0 0 1-1.52-5.29c0-5.5 4.48-9.98 9.99-9.98 2.67 0 5.17 1.04 7.06 2.93a9.92 9.92 0 0 1 2.92 7.06c0 5.5-4.48 9.95-9.99 9.95zm5.47-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.41-1.49-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.24-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.52.08-.8.38-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.11 3.22 5.11 4.51.71.31 1.27.5 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}

/**
 * Floating "Écris-nous" button: opens the shop's WhatsApp Business chat (COMPANY.whatsapp).
 * Not shown when no link is set.
 */
export function WhatsAppButton() {
  if (!COMPANY.whatsapp) return null;
  return (
    <a
      href={COMPANY.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-105 active:scale-95"
    >
      <WhatsAppMark />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-[15px] font-medium transition-[max-width] duration-500 group-hover:max-w-40 md:inline">Écris-nous</span>
    </a>
  );
}
