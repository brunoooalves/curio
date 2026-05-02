import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/lote", destination: "/plano", permanent: true },
      { source: "/lote/novo", destination: "/plano/novo", permanent: true },
      { source: "/lote/:id", destination: "/plano/:id", permanent: true },
      { source: "/lotes", destination: "/planos", permanent: true },
    ];
  },
};

export default nextConfig;
