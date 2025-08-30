import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    reactStrictMode: false, // BlockNote compatibility
    devIndicators: {
        position: 'bottom-right',
    },
    eslint: {
        ignoreDuringBuilds: false,
        dirs: ['src'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'litigation-support.robertmoggach.com',
                pathname: '/**',
            },
        ],
    },
    webpack: (config) => {
        config.module.rules.push({
            test: /\.md$/,
            type: 'asset/source',
        })
        return config
    },
}

export default nextConfig
