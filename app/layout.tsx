import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'WBS Labor Tracker',
  description: 'Track labor hours against WBS estimates',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-800 min-h-screen">
        <Navbar />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
