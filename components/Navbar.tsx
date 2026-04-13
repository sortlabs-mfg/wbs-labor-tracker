'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/estimates', label: 'Estimates' },
  { href: '/jobs', label: 'Jobs' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-700 text-white shadow-md">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center h-14 gap-8">
        <Link href="/" className="font-bold text-lg tracking-tight text-white hover:text-blue-300 transition-colors">
          WBS Tracker
        </Link>
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-white/20 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
