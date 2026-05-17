// src/app/layout.js
import "./globals.css";

export const metadata = {
  title:       "BOSS — Build Trust. Grow Faster.",
  description: "The operating system for artisan businesses. Manage orders, clients, payments and grow your craft business.",
  manifest:    "/manifest.json",
  icons: {
    icon:    [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple:   [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title:       "BOSS — Build Trust. Grow Faster.",
    description: "The operating system for artisan businesses.",
    siteName:    "BOSS",
    type:        "website",
  },
};

export const viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit:  "cover",
  themeColor:   "#1C1C1E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <link rel="apple-touch-icon" href="/favicon.svg"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
