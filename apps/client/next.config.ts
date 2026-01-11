import type { NextConfig } from "next";

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// CSP directives - stricter in production
const scriptSrc = isProduction
  ? "script-src 'self'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'"; // 'unsafe-eval' needed for Next.js dev mode

const styleSrc = isProduction
  ? "style-src 'self'"
  : "style-src 'self' 'unsafe-inline'"; // 'unsafe-inline' needed for Tailwind in dev mode

// Build-time validation to prevent unsafe CSP directives in production
// Prevents accidental deployment of development CSP settings
if (isProduction) {
  if (scriptSrc.includes('unsafe-eval') || scriptSrc.includes('unsafe-inline')) {
    throw new Error(
      'SECURITY VIOLATION: Unsafe CSP directives (unsafe-eval, unsafe-inline) detected in production build. ' +
      'This is a critical security vulnerability. Please check your Next.js configuration.',
    );
  }
  if (styleSrc.includes('unsafe-inline')) {
    throw new Error(
      'SECURITY VIOLATION: Unsafe CSP directive (unsafe-inline) detected in production build. ' +
      'This is a security vulnerability. Please check your Next.js configuration.',
    );
  }

  // Build-time validation to prevent localhost/127.0.0.1 in production
  // Prevents exposing internal infrastructure URLs in the client bundle
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl || apiBaseUrl.trim() === '') {
    throw new Error(
      'SECURITY ERROR: NEXT_PUBLIC_API_BASE_URL is required in production. ' +
      'Please set this environment variable to your production API URL.',
    );
  }

  const normalizedApiUrl = apiBaseUrl.trim().toLowerCase();
  if (
    normalizedApiUrl.includes('localhost') ||
    normalizedApiUrl.includes('127.0.0.1') ||
    normalizedApiUrl.includes('0.0.0.0') ||
    normalizedApiUrl.startsWith('http://') // HTTP is insecure in production
  ) {
    throw new Error(
      'SECURITY VIOLATION: NEXT_PUBLIC_API_BASE_URL contains localhost, 127.0.0.1, 0.0.0.0, or uses HTTP in production. ' +
      'This exposes internal infrastructure and is a critical security vulnerability. ' +
      'Please set NEXT_PUBLIC_API_BASE_URL to a valid HTTPS production URL.',
    );
  }

  // Validate URL format
  try {
    const url = new URL(apiBaseUrl);
    if (url.protocol !== 'https:') {
      throw new Error(
        'SECURITY VIOLATION: NEXT_PUBLIC_API_BASE_URL must use HTTPS in production. ' +
        'HTTP is insecure and allows man-in-the-middle attacks.',
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'SECURITY ERROR: NEXT_PUBLIC_API_BASE_URL is not a valid URL. ' +
        'Please provide a valid HTTPS URL (e.g., https://api.example.com).',
      );
    }
    throw error;
  }
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      styleSrc,
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      // Only allow connections to self and the configured API base URL
      // Removed overly permissive https://* wildcard for stricter CSP
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
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
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
