import './globals.css';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { ChampionProvider } from '@/components/ChampionProvider';

export const metadata = {
  title: 'BOLÃO COPA 2026',
  description: 'O aplicativo definitivo de bolão da Copa do Mundo de 2026',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bolão 2026',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#10b981',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <ChampionProvider>
          <ServiceWorkerRegistrar />
          <div className="phone-viewport">
            {children}
          </div>
        </ChampionProvider>
      </body>
    </html>
  );
}
