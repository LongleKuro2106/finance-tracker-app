import type { NextConfig } from 'next';

// Conditionally apply CSP directives based on environment
const isProduction = process.env.NODE_ENV === 'production';

// In production, allow unsafe-inline for Next.js inline scripts (required for hydration)
// Note: 'unsafe-inline' is a security trade-off but necessary for Next.js App Router
// TODO: Migrate to nonce-based CSP for better security (Next.js 13+ supports nonces via middleware)
// In development, allow unsafe directives for Next.js dev mode and Tailwind
const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

// SECURITY: Allow 'unsafe-inline' for styles in production
// Next.js, Radix UI, and Tailwind CSS inject inline styles dynamically
// This is a necessary trade-off for framework compatibility
// TODO: Migrate to nonce-based CSP when Next.js middleware fully supports it
const styleSrc = isProduction
  ? "style-src 'self' 'unsafe-inline'"
  : "style-src 'self' 'unsafe-inline'";

// Security headers configuration
// These headers protect against common web vulnerabilities
const securityHeaders = [
  {
    // Content Security Policy: Prevents XSS attacks by restricting resource loading
    // Controls which resources (scripts, styles, images) can be loaded and from where
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'", // Default: only allow resources from same origin
      scriptSrc, // Script sources (varies by environment)
      styleSrc, // Style sources (varies by environment)
      "img-src 'self' data: https:", // Images from same origin, data URIs, and HTTPS
      "font-src 'self' data:", // Fonts from same origin and data URIs
      `connect-src 'self' ${
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      }`, // Allow API calls to backend only
      "frame-ancestors 'none'", // Prevent embedding in iframes (clickjacking protection)
      "base-uri 'self'", // Restrict base tag URLs to same origin
      "form-action 'self'", // Restrict form submissions to same origin
    ].join('; '),
  },
  {
    // X-DNS-Prefetch-Control: Enables DNS prefetching for performance
    // Allows browser to resolve DNS names in advance
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    // Strict-Transport-Security: Forces HTTPS connections
    // Prevents man-in-the-middle attacks and protocol downgrade attacks
    // max-age: 2 years, applies to all subdomains, allows preload list inclusion
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // X-Frame-Options: Prevents clickjacking attacks
    // DENY prevents page from being embedded in iframe on any site
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // X-Content-Type-Options: Prevents MIME type sniffing attacks
    // Forces browser to respect Content-Type header, preventing XSS via file uploads
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // X-XSS-Protection: Legacy XSS protection (for older browsers)
    // Modern browsers use CSP instead, but this provides defense-in-depth
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Referrer-Policy: Controls referrer information leakage
    // strict-origin-when-cross-origin: sends full URL for same-origin, origin only for cross-origin
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Permissions-Policy: Disables browser features not needed by the application
    // Prevents access to camera, microphone, and geolocation APIs
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  // Enable React compiler optimizations
  reactStrictMode: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@radix-ui/react-slot',
      '@radix-ui/react-label',
    ],
  },
  // Compression
  compress: true,
  // Power optimizations
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
