import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ビルド時にESLintエラーを無視
    ignoreDuringBuilds: true,
  },
  // 実験的機能で高速化
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // パフォーマンス最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 静的最適化
  output: 'standalone',
  // 画像最適化
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config, { isServer }) => {
    // キャッシュ最適化
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    }
    
    if (!isServer) {
      // クライアントサイドでNode.js専用モジュールを無視
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        util: false,
        querystring: false,
      };
    }
    return config;
  },
  // 静的ファイルのホスト名を修正
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  // 開発環境での設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
