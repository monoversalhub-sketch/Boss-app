// src/app/layout.js
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400","500","600","700","800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata = {
  title:       "BOSS — Build Trust. Grow Faster.",
  description: "The operating system for artisan businesses. Manage orders, clients, payments and grow your craft business.",
  manifest:    "/manifest.json",
  verification: {
    google: "googlec15a44381ada5908",
  },
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
    <html lang="en" className={plusJakarta.variable}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <link rel="apple-touch-icon" href="/favicon.svg"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
