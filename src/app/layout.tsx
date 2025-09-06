import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClientToaster from "@/components/ClientToaster"; // ✅ default import

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlogCluster Pro – AI-Powered Content Clusters",
  description:
    "BlogCluster Pro delivers research-backed blog clusters with EEAT citations, SEO optimization, and one-click WordPress publishing. No keys, no tokens, no headaches.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#2563eb" },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Navbar />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
          <ClientToaster /> {/* ✅ global Sonner toaster (client component) */}
        </body>
      </html>
    </ClerkProvider>
  );
}