import type { Metadata } from "next";
import "./globals.css";

// Metadata is used by Next.js to set the <title> and <meta description> tags
// automatically — no need to write <head> tags manually
export const metadata: Metadata = {
  title: "AI Viral Moment Clipper",
  description: "Paste a YouTube link. Get viral clips.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        The body here just sets a dark background and text color using Tailwind.
        Every page in the app inherits this base styling.
        `antialiased` makes fonts render sharper on most screens.
      */}
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
