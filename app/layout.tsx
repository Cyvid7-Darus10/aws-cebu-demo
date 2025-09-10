import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AmplifyProvider } from "./amplify-provider";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QR Code Generator - Create, Track & Manage QR Codes",
  description:
    "Generate QR codes instantly with our powerful QR code generator. Track scans, manage your codes, and get detailed analytics. Perfect for marketing, events, and business use.",
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
    url: "https://main.d2uj1ffub6eiln.amplifyapp.com",
    title: "QR Code Generator - Create, Track & Manage QR Codes",
    description:
      "Generate QR codes instantly with our powerful QR code generator. Track scans, manage your codes, and get detailed analytics.",
    siteName: "QR Code Generator",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "QR Code Generator - Create, Track & Manage QR Codes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Generator - Create, Track & Manage QR Codes",
    description:
      "Generate QR codes instantly with our powerful QR code generator. Track scans, manage your codes, and get detailed analytics.",
    images: ["/og-image.jpg"],
    creator: "@qrgenerator",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://main.d2uj1ffub6eiln.amplifyapp.com",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "QR Code Generator",
  description: "Generate QR codes instantly with tracking and analytics",
  url: "https://main.d2uj1ffub6eiln.amplifyapp.com",
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
