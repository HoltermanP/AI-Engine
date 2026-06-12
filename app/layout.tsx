import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { ConditionalClerkProvider } from '@/components/conditional-clerk-provider';
import { ToastViewport } from '@/components/toast-viewport';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'InfraEngine — Ondergrondse infrastructuur',
  description:
    'Ontwerp- en procesondersteuningstool voor kabels en leidingen: engineering, GIS, conflictdetectie en omgevingsproces.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="nl">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
        <ToastViewport />
      </body>
    </html>
  );

  return <ConditionalClerkProvider>{body}</ConditionalClerkProvider>;
}
