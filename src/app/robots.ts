import type { MetadataRoute } from "next";

// La app contiene datos personales de los jugadores: nada se indexa.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
