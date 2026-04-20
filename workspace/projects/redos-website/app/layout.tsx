import type { Metadata } from 'next';
import './globals.css';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'RedOS — AI-Powered Development at Scale',
    template: '%s | RedOS',
  },
  description:
    'RedOS delivers intelligent, scalable software solutions powered by cutting-edge AI technology. 8 autonomous agents. Infinite scale.',
  keywords: ['AI development', 'autonomous agents', 'software', 'RedOS'],
  openGraph: {
    title: 'RedOS — AI-Powered Development at Scale',
    description: 'RedOS delivers intelligent, scalable software solutions powered by cutting-edge AI.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
