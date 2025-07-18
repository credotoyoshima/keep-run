import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RouteProgress } from "@/components/layout/RouteProgress";
import { QueryProvider } from "@/lib/providers/query-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Keep Run",
  description: "継続的な成長のためのタスク管理ツール",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["タスク管理", "習慣", "継続", "成長", "ルーティン"],
  authors: [{ name: "Keep Run" }],
  creator: "Keep Run",
  publisher: "Keep Run",
  icons: [
    { rel: "apple-touch-icon", url: "/icon-192.svg" },
    { rel: "icon", url: "/favicon.svg" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Keep Run" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-startup-image" href="/icons/icon.svg" />
        {/* suppress-devtools.jsの読み込みを一時的にコメントアウト
        <script src="/suppress-devtools.js" defer></script>
        */}
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          {children}
        </QueryProvider>
        {/* Service Worker登録を一時的にコメントアウト
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
        */}
        <RouteProgress />
      </body>
    </html>
  );
}
