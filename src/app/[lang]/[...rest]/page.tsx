import { notFound } from "next/navigation";

// Any address the site doesn't have: the site's 404 page (src/app/[lang]/not-found.tsx), in its language.
export default function Page() {
  notFound();
}
