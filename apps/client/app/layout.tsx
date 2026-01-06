import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import for side effects
import "./globals.css";
import LoadingOverlay from "@/components/shared/loading-overlay";
import { ToastProvider } from "@/components/shared/toast";
import { ThemeProvider } from "@/components/shared/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal finance tracking application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
        <ToastProvider>
          <LoadingOverlay />
          {children}
        </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
