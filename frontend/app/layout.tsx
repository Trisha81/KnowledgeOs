import './globals.css';
import type { Metadata } from 'next';
import RootShell from '../components/RootShell';

export const metadata: Metadata = {
  title: 'KnowledgeOS – AI-Powered Knowledge Management',
  description: 'Enterprise AI Knowledge Management System with RAG-powered search, gap analysis, and intelligent document processing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
