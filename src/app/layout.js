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
    weight: ['400', '600'],
});

export const metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://shop-license-system.vercel.app'),
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
        icon: [
            { url: '/image/favicon.png', type: 'image/png' },
            { url: '/favicon.ico', sizes: 'any' }
        ],
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
                <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
            </head>
            <body suppressHydrationWarning>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'SoftwareApplication',
                            name: 'Shop License System',
                            applicationCategory: 'BusinessApplication',
                            operatingSystem: 'Web',
                            offers: {
                                '@type': 'Offer',
                                price: '0',
                                priceCurrency: 'THB'
                            },
                            description: 'ระบบจัดการใบอนุญาตร้านค้าช่วยให้คุณจัดการข้อมูลและต่ออายุใบอนุญาตได้อย่างมีประสิทธิภาพ'
                        })
                    }}
                />
                {children}
                <SpeedInsights debug={false} />
                <Analytics debug={false} />
            </body>
        </html>
    );
}

