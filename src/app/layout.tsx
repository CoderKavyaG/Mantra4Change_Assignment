import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PBL Program Intelligence Dashboard - Mantra4Change",
  description: "Comprehensive analytical dashboard for project-based learning (PBL) implementation tracking, student enrollment, average attendance rates, and geographic risk status classification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <nav className="navbar">
          <div className="navbar-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent)", stroke: "var(--accent)" }}>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ marginLeft: "0.25rem" }}>PBL Program Intelligence</span>
          </div>
          <div className="navbar-nav">
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/grants" className="nav-link">Grant Assistant</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
