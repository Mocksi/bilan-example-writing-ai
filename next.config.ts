import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable CSS source maps to prevent 404 errors in development
  productionBrowserSourceMaps: false,
  
  webpack: (config, { isServer, dev }) => {
    // Configure source maps for clean development experience
    if (dev) {
      // Keep JS source maps but disable CSS source maps
      config.devtool = 'eval-cheap-module-source-map';
      
      // Disable CSS source map generation to prevent 404s
      const rules = config.module.rules.find((rule: any) => typeof rule.oneOf === 'object');
      if (rules && rules.oneOf) {
        rules.oneOf.forEach((rule: any) => {
          if (rule.use && Array.isArray(rule.use)) {
            rule.use.forEach((use: any) => {
              if (use.loader && use.loader.includes('css-loader')) {
                if (use.options) {
                  use.options.sourceMap = false;
                }
              }
            });
          }
        });
      }
    }
    
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
