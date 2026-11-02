import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const display = localFont({
  src: [
    { path: "../../public/fonts/sentient-light.woff2", weight: "300" },
    { path: "../../public/fonts/sentient-regular.woff2", weight: "400" },
  ],
  variable: "--font-estate-display",
  display: "swap",
});
const body = localFont({
  src: "../../public/fonts/hanken-regular.ttf",
  weight: "400",
  variable: "--font-estate-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Aavana Estate | A slower stay in the hills",
  description:
    "A fictional coffee-estate resort booking demo in Chikkamagaluru.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
