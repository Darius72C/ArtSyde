import { Inter, Rubik_Glitch, Yuji_Syuku } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const glitch = Rubik_Glitch({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-glitch",
  display: "swap",
});

// Seul le caractère 芸 est utilisé : on ne charge pas toute la police japonaise.
export const kanji = Yuji_Syuku({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-kanji-jp",
  display: "swap",
  preload: false,
});

export const fontVariables = `${inter.variable} ${glitch.variable} ${kanji.variable}`;
