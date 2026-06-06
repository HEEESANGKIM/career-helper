import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AuthControls from "@/components/auth-controls";
import { ProfileGateProvider } from "@/components/profile-gate-provider";
import ThemeToggle from "@/components/theme-toggle";
import LanguageToggle from "@/components/language-toggle";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "Pathmate.ai",
  description: "Premium AI career cockpit for Resume Lab, Hiring Simulator, Next Move, and Job Match.",
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

const logoVersion = "2026-06-01-single";

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
          <ProfileGateProvider>
            <header className="top-nav">
            <div className="top-nav__bar mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <Link href="/" aria-label="PathMate Home" className="top-nav-logo">
                <img
                  src={`/logo.png?v=${logoVersion}`}
                  alt=""
                  width={1536}
                  height={1024}
                  decoding="async"
                />
              </Link>
              <div className="top-nav-actions w-full sm:w-auto">
                <LanguageToggle />
                <ThemeToggle />
                <AuthControls variant="top" />
              </div>
            </div>
          </header>
          {children}
          </ProfileGateProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
