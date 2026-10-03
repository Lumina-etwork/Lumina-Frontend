import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Nav from '@/components/Nav';
import { StreamProvider } from '@/lib/stream';

export const metadata: Metadata = {
  title: 'Lumina Network',
  description:
    'On-chain creator IP anchoring and demographic-blind talent matching, powered by Soroban.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 font-sans text-slate-100 antialiased">
        <StreamProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-600">
            Lumina Network · SDG 5 · merit-only matching, no demographics indexed
          </footer>
        </StreamProvider>
      </body>
    </html>
  );
}
