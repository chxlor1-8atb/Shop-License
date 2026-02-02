/** @type {import('next').NextConfig} */
// Force restart: resolve hydration mismatch - timestamp: 2026-01-14
const nextConfig = {
    // Enable React strict mode for better development
    reactStrictMode: true,

    // Optimize images (reduce bandwidth & CPU)
    images: {
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60,
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    // Compiler optimizations
    compiler: {
        // Remove console.log in production (reduce bundle & security)
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // Experimental optimizations (reduce bundle size significantly)
    experimental: {
        // Optimize package imports - tree shake unused exports
        optimizePackageImports: [
            'chart.js',
            'react-chartjs-2',
            'sweetalert2',
            'bcryptjs',
            '@neondatabase/serverless',
            'iron-session',
            'lucide-react',
            'react-icons',
            'clsx',
            'tailwind-merge'
        ],
        // Enable CSS optimization 
        optimizeCss: true,
    },

    // Transpile specific packages for better code splitting
    transpilePackages: ['pdfmake'],

    // Headers for caching static assets and security
    async headers() {
        // Content Security Policy
        const cspHeader = `
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://cdnjs.cloudflare.com https://va.vercel-scripts.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
            font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:;
            img-src 'self' data: blob: https:;
            frame-src 'self' https://challenges.cloudflare.com;
            connect-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com https://va.vercel-scripts.com https://vitals.vercel-insights.com;
            object-src 'none';
            base-uri 'self';
            form-action 'self';
            frame-ancestors 'none';
            upgrade-insecure-requests;
        `.replace(/\s{2,}/g, ' ').trim();

        const securityHeaders = [
            {
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
            },
            {
                key: 'X-Frame-Options',
                value: 'DENY',
            },
            {
                key: 'X-Content-Type-Options',
                value: 'nosniff',
            },
            {
                key: 'Referrer-Policy',
                value: 'strict-origin-when-cross-origin',
            },
            {
                key: 'Permissions-Policy',
                value: 'camera=(), microphone=(), geolocation=()',
            },
        ];

        // Only apply CSP in production to avoid interfering with React DevTools and Hot Reload in development
        if (process.env.NODE_ENV === 'production') {
            securityHeaders.push({
                key: 'Content-Security-Policy',
                value: cspHeader,
            });
        }

        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ];
    },
    async redirects() {
        return [
            {
                source: '/login',
                destination: '/',
                permanent: true,
            },
        ];
    },
}

module.exports = nextConfig
