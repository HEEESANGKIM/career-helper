import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import AuthControls from "@/components/auth-controls";
import ThemeToggle from "@/components/theme-toggle";
import LanguageToggle from "@/components/language-toggle";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "Pathmate.ai",
  description: "Premium AI career cockpit for profiles, matching, documents, and interview practice.",
};

const themeInitScript = `
(() => {
  try {
    const saved = window.localStorage.getItem("pathmate-theme");
    const theme = saved === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

const logoVersion = "2026-04-26-1524";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <header className="top-nav">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
              <Link href="/" aria-label="PathMate Home" className="inline-flex h-10 items-center overflow-visible sm:h-11">
                <Image
                  src={`/logo.png?v=${logoVersion}`}
                  alt="PathMate"
                  width={1536}
                  height={1024}
                  className="-my-3 h-16 w-auto max-w-none object-contain sm:-my-4 sm:h-20"
                  priority
                  unoptimized
                />
              </Link>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                <LanguageToggle />
                <ThemeToggle />
                <AuthControls variant="top" />
              </div>
            </div>
          </header>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}


