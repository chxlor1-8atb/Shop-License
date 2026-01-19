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
    title: {
        default: 'ระบบจัดการใบอนุญาตร้านค้า | Shop License System',
        template: '%s | Shop License System'
    },
    description: 'ระบบจัดการใบอนุญาตร้านค้าครบวงจร ช่วยให้คุณจัดการข้อมูลร้านค้า ใบอนุญาต และการแจ้งเตือนวันหมดอายุได้อย่างมีประสิทธิภาพ ปลอดภัย และใช้งานง่าย',
    keywords: ['ระบบจัดการร้านค้า', 'ใบอนุญาต', 'Shop License', 'Management System', 'ต่ออายุใบอนุญาต', 'ระบบแจ้งเตือน'],
    authors: [{ name: 'Shop License Team' }],
    creator: 'Shop License Team',
    publisher: 'Shop License System',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: '/image/favicon.png',
        shortcut: '/image/favicon.png',
        apple: '/image/favicon.png',
    },
    openGraph: {
        title: 'ระบบจัดการใบอนุญาตร้านค้า | Shop License System',
        description: 'ยกระดับการจัดการร้านค้าของคุณด้วยระบบที่ใช้งานง่าย ปลอดภัย และรวดเร็ว',
        url: 'https://shop-license-system.vercel.app',
        siteName: 'Shop License System',
        images: [
            {
                url: '/image/og-image.png', // Make sure this exists or use a placeholder if not
                width: 1200,
                height: 630,
                alt: 'Shop License System Preview',
            },
        ],
        locale: 'th_TH',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ระบบจัดการใบอนุญาตร้านค้า',
        description: 'จัดการใบอนุญาตร้านค้าของคุณได้ง่ายๆ ในที่เดียว',
        images: ['/image/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
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
        <html lang="th" className={`${inter.variable} ${notoSansThai.variable}`} suppressHydrationWarning>
            <head>
                {/* DNS Prefetch for faster external resource loading */}
                <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />

                {/* Preconnect for critical resources */}
                <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />

                {/* Google Fonts - Inter and Noto Sans Thai are handled by next/font/google above */}

                {/* Font Awesome - restored to standard loading to ensure icons appear correctly */}
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                    crossOrigin="anonymous"
                />

            </head>
            <body suppressHydrationWarning>
                {children}
                <SpeedInsights debug={false} />
                <Analytics debug={false} />
            </body>
        </html>
    );
}

