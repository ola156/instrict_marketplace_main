import { Inter } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider" 

// Configure Inter font
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* bg-[#FAFAFA] had no dark: variant — body stayed light in both
          themes. Any gap in child layouts (mobile viewport-height quirks,
          short content, etc) exposed this instead of falling back to
          dark, which is exactly the white-space bug seen on the menu
          section. Every other component in the app pairs a light bg
          with a dark: variant; body was the one place that didn't. */}
      <body className={`${inter.className} antialiased bg-[#FAFAFA] dark:bg-slate-950 overflow-x-hidden`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}