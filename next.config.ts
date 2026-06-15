import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "*": [
      "./.git/**",
      "./src-tauri/**",
      "./storage/**"
    ]
  },
  serverExternalPackages: ["tiktok-live-connector"],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/uploads/animations/workspaces/:workspaceId/:file*",
          destination: "/media/animations/workspaces/:workspaceId/:file*"
        },
        {
          source: "/uploads/animations/default/:file*",
          destination: "/media/animations/default/:file*"
        },
        {
          source: "/upload/animations/default/:file*",
          destination: "/media/animations/legacy-default/:file*"
        }
      ]
    };
  }
};

export default nextConfig;
