import { Inter, Inter_Tight } from "next/font/google";

// Shared by the two root layouts (the site in /[lang], the admin).
export const display = Inter_Tight({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
export const body = Inter({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });
