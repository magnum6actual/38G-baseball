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
  title: "38G Talent Search",
  description: "Military Government Specialist talent discovery and profile management",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-gray-200 hover:text-[#FFD700] hover:bg-white/10 rounded-md transition-colors"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* Header */}
        <header className="army-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-[#FFD700]">38G</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-semibold text-white">Talent Search</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex items-center gap-1">
                <NavLink href="/search">Search</NavLink>
                <NavLink href="/builder">Card Builder</NavLink>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-muted border-t flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-xs text-muted-foreground text-center">
              38G Military Government Specialist Program
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
