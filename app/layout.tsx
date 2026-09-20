import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import RateBoard from "@/components/RateBoard";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Appachi Jewellery",
  description: "Quotation and billing system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b"
          style={{
            background:
              "linear-gradient(to right, #2b2420, #3a2f26)",
            borderColor: "var(--primary)",
          }}
        >
          <Link
            href="/"
            className="heading text-lg sm:text-xl font-semibold tracking-wide"
            style={{ color: "var(--primary)" }}
          >
            Appachi Jewellery
          </Link>
          <RateBoard />
        </header>
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
