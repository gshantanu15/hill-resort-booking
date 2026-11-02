import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Aavana Estate | A slower stay in the hills",
  description:
    "A fictional coffee-estate resort booking demo in Chikkamagaluru.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
