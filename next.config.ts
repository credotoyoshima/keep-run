import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ビルド時にESLintエラーを無視
    ignoreDuringBuilds: true,
  },
  // 実験的機能で高速化
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    // より積極的な最適化
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
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
    // より積極的なキャッシュ最適化
    config.cache = {
      type: 'filesystem',
      maxMemoryGenerations: 1,
      buildDependencies: {
        config: [__filename],
      },
    }
    
    // パフォーマンス向上のための最適化
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
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
  // パフォーマンス向上のためのヘッダー設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
