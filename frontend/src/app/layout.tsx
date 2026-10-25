import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
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

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Resume Customizer AI — Premium AI Resume Studio",
  description: "Commercial-grade AI resume studio powered by FastAPI and Gemini AI. Real-time ATS compatibility scoring, interactive inline resume editing, explainable matching analysis, and multi-version management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B101A] text-[#F7F7FA] font-sans selection:bg-[#2C224B] selection:text-[#B89AFF]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
