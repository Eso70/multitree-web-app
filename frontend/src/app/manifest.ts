import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MultiTree Mini Website",
    short_name: "Mini Website",
    description: "A business Mini Website powered by MultiTree",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b6f20d",
    icons: [
      { src: "/images/Logo.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
  };
}
