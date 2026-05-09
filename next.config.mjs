import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3200',
        // newapi.pro domains
        'nodekey-docs.biandianyun.com',
        'nodekey-docs.xinghanyun.cn',
      ],
    },
  },
  async headers() {
    return [
      {
        // Apply charset to HTML pages
        source: '/:lang(en|zh|ja)/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html; charset=utf-8',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:lang(en|zh|ja)/docs',
        destination: '/:lang',
        permanent: true,
      },
      {
        source: '/:lang(en|zh|ja)/docs/:path*',
        destination: '/:lang/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/:lang(en|zh|ja)/:path*.mdx',
        destination: '/:lang/llms.mdx/:path*',
      },
    ];
  },
};

export default withMDX(config);
