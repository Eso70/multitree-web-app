import type { MetadataRoute } from "next";
import { SPONSOR_KRD_LOGO_MARK } from "@/lib/brand/brand-assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sponsor.krd",
    short_name: "Sponsor.krd",
    description: "Create and share a branded Linktree with Sponsor.krd",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#25F4EE",
    icons: [
      { src: SPONSOR_KRD_LOGO_MARK, sizes: "512x512", type: "image/png" },
    ],
  };
}
