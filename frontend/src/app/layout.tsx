import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Resume Customizer AI — Career Atelier & Precision Optimization",
  description: "Editorial-grade career narrative optimization powered by FastAPI and Gemini AI. Anti-fabrication verification, transparent ATS analysis, and publication-ready documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F2EB] text-[#291B32] font-sans selection:bg-[#E8D9E8] selection:text-[#291B32]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
