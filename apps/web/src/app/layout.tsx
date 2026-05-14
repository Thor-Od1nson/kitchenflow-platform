import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'KitchenFlow Commerce | Restaurant commerce infrastructure',
  description:
    'Restaurant SaaS for delivery aggregator integrations, POS sync, online orders, menus, analytics, inventory, and multi-location operations.',
  keywords: [
    'restaurant SaaS',
    'food delivery integrations',
    'POS integrations',
    'cloud kitchen software',
    'menu management',
    'restaurant analytics'
  ],
  openGraph: {
    title: 'KitchenFlow Commerce',
    description: 'Run every food commerce channel from one enterprise operations platform.',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
