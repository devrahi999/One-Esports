import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'One Esports — Tournament',
  description: 'Free Fire Tournament Management Platform by One Esports. Real-time match updates, group results, and leaderboards.',
  keywords: ['Free Fire', 'Tournament', 'Esports', 'Bangladesh', 'One Esports'],
  openGraph: {
    title: 'One Esports Tournament',
    description: 'Free Fire Tournament Management Platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
