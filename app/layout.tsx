import type { Metadata, Viewport } from "next";
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

const TITLE = "Rockstar";
const DESCRIPTION = "Build courses, answer students and manage enrollments.";

// Where a shared link's preview image resolves from. Unset, Next.js falls
// back to the Vercel deployment URL on Vercel and to localhost elsewhere, so
// set this to the console's public origin wherever it is hosted.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/*
  The icons and the preview image are file conventions beside this layout:
  favicon.ico, icon.svg and apple-icon.png are the R from the lockup on its red
  plate, and opengraph-image.jpg (with its .alt.txt) is the card a pasted link
  unfurls into. Next.js writes their tags from the files themselves.
*/
export const metadata: Metadata = {
  ...(SITE_URL && { metadataBase: new URL(SITE_URL) }),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // A signed-in team console: a preview where a link is shared, but nothing
  // for a search engine to list.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // The charcoal page colour, so a phone's browser bar matches the console.
  themeColor: "#111111",
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
