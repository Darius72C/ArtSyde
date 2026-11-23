"use client";

import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { localizeHref } from "@/lib/i18n";
import { useLocale } from "./I18nProvider";

/** next/link that keeps the visitor in their language: "/panier" points to /en/panier on the English site. */
const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, ...rest }, ref) {
  const locale = useLocale();
  const to = typeof href === "string" ? localizeHref(locale, href) : href.pathname ? { ...href, pathname: localizeHref(locale, href.pathname) } : href;
  return <NextLink ref={ref} href={to} {...rest} />;
});

export default Link;
