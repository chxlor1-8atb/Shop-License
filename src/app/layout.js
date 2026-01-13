import './globals.css';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, Noto_Sans_Thai } from 'next/font/google';

// Optimize fonts with next/font - eliminates font CLS
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
    preload: true,
});

const notoSansThai = Noto_Sans_Thai({
    subsets: ['thai'],
    display: 'swap',
    variable: '--font-noto-thai',
    preload: true,
    weight: ['400', '500', '600', '700'],
});

export const metadata = {
    title: 'ระบบจัดการใบอนุญาตร้านค้า',
    description: 'Shop License Management System',
    icons: {
        icon: '/image/favicon.png',
    },
};

// Viewport configuration for better mobile experience
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#D97757',
};

export default function RootLayout({ children }) {
    return (
        <html lang="th" className={`${inter.variable} ${notoSansThai.variable}`}>
            <head>
                {/* DNS Prefetch for faster external resource loading */}
                <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />

                {/* Preconnect for critical resources */}
                <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />

                {/* Google Fonts - Inter and Noto Sans Thai are handled by next/font/google above */}

                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                    crossOrigin="anonymous"
                />

            </head>
            <body>
                {children}
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}

