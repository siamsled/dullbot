import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "DullBot — Boringly Efficient AI Sales Agent",
  description: "Deadpan, cynical, ruthlessly efficient AI sales assistant for small businesses. Protects your margins, captures orders, and handles payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('dullbot_theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-dark-mode', 'true');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-dark-mode', 'false');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-ink font-sans selection:bg-apricot-wash selection:text-ink transition-colors duration-200">
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

