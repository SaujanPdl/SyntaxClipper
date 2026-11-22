import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyntaxClipper by Syntax Nepal - Autonomous Video Clipper',
  description: 'Production-grade local video clipping and multi-platform publishing application.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0E1015] text-[#F0F3F6] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
