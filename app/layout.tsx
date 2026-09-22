import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Raleway } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Editorial headlines and module titles.
const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

// Body and interface — labels, copy, inputs.
const ui = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

// The wordmark, navigation and uppercase eyebrows.
const word = Raleway({
  variable: "--font-word-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rockstar Studio",
  description: "Micro-learning for hairdressers & artists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${display.variable} ${ui.variable} ${word.variable} h-full`}>
        {/*
          Browser extensions edit <body> before React hydrates — a video-speed
          controller adds `vsc-initialized`, ad blockers and dark-mode tools add
          their own — and React reports the class it did not render as a
          hydration mismatch on every page. Nothing here depends on body's
          class list matching between server and client, so the warning is
          suppressed at the one element extensions actually touch rather than
          left to cry wolf over a real mismatch elsewhere.
        */}
        <body className="rs h-full" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
