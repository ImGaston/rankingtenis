import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La app depende de la sesión en casi todas las rutas: se usa el modelo
  // clásico de renderizado dinámico en lugar de Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
