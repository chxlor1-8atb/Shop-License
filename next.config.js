/** @type {import('next').NextConfig} */
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
            'iron-session'
        ],
    },

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

        return [
            // Security headers for all routes
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: cspHeader,
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
                ],
            },
            // Cache headers for static assets
            {
                source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
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
