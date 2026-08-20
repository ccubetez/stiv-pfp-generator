import type { Metadata } from "next";
import { Zilla_Slab } from "next/font/google";
import BackgroundFX from "./components/BackgroundFX";
import "./globals.css";

// Zilla Slab — ближайший свободный аналог American Typewriter:
// рубленые засечки, «пишущая машинка», но пропорциональный
const slab = Zilla_Slab({
  variable: "--font-slab",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STIV — make your undying STIV!",
  description: "dress the STIV or stiv-ify your pfp. he never dies — he just changes outfits.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={slab.variable}>
      <body>
        <BackgroundFX />
        {children}
      </body>
    </html>
  );
}
