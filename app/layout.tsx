import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fivefold Veil",
  description: "Five teams. Five discoveries. One shared signal.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
