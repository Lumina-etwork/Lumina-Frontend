'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LiveBadge from './LiveBadge';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/talent', label: 'Blind talent' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-ink-800/80 bg-ink-900/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-aurora-500 text-sm font-bold text-ink-950">
            L
          </span>
          <span className="text-lg font-semibold tracking-tight">Lumina Network</span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-ink-800 text-white'
                    : 'text-slate-400 hover:bg-ink-800/60 hover:text-slate-200'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="ml-3">
            <LiveBadge />
          </span>
        </nav>
      </div>
    </header>
  );
}
