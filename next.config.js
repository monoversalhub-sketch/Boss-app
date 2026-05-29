/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          // NOTE: X-Frame-Options: DENY removed — it blocks the app from
          // loading in certain mobile WebViews and PWA shells.
          // CSP frame-ancestors 'none' provides equivalent protection.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-inline' for its runtime script injection.
              // Without this the app silently fails to hydrate → blank screen.
              "script-src 'self' 'unsafe-inline' https://js.paystack.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // fonts.gstatic.com serves the actual font files
              "font-src 'self' data: https://fonts.gstatic.com",
              // Supabase, Paystack API, WhatsApp links
               "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://accounts.google.com",
               // Paystack checkout iframe + WhatsApp web + Google OAuth
               "frame-src https://checkout.paystack.com https://accounts.google.com",
              // Favicon, logo, avatar images
              "img-src 'self' data: blob: https:",
              // Prevent framing from outside origins
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
