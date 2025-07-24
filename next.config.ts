import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Ensure WebLLM is only loaded on client-side to avoid SSR issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Mark WebLLM as client-side only module
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('@mlc-ai/web-llm');
    }
    
    return config;
  },

};

export default nextConfig;
