import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AmplifyProvider } from "./amplify-provider";
import Header from "./components/Header";
import { config, getFullUrl } from "@/lib/config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${config.app.name} - Create, Track & Manage QR Codes`,
  description: config.app.description,
  keywords: [
    "QR code generator",
    "QR code",
    "barcode generator",
    "QR scanner",
    "QR tracking",
    "marketing tools",
    "digital marketing",
    "analytics",
  ],
  authors: [{ name: "QR Generator Team" }],
  creator: "QR Generator",
  publisher: "QR Generator",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: config.baseUrl,
    title: `${config.app.name} - Create, Track & Manage QR Codes`,
    description: config.app.description,
    siteName: config.app.siteName,
    images: [
      {
        url: getFullUrl("/og-image.png"),
        width: 1200,
        height: 630,
        alt: `${config.app.name} - Create, Track & Manage QR Codes`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${config.app.name} - Create, Track & Manage QR Codes`,
    description: config.app.description,
    images: [getFullUrl("/og-image.png")],
    creator: config.social.twitterHandle,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: config.baseUrl,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: config.app.name,
  description: config.app.description,
  url: config.baseUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "QR Code Generation",
    "Scan Tracking",
    "Analytics Dashboard",
    "Bulk QR Creation",
    "Custom QR Codes",
  ],
  author: {
    "@type": "Organization",
    name: "QR Generator Team",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <meta
          name="google-site-verification"
          content="your-google-verification-code"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body className={inter.className}>
        <AmplifyProvider>
          <Header />
          {children}
        </AmplifyProvider>
      </body>
    </html>
  );
}
