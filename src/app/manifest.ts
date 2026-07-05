import type { MetadataRoute } from "next";
import { branding } from "@/lib/branding";

// Lets you "Add to Home Screen" on a phone so the app opens full-screen
// with its own icon, like a real app, instead of a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.businessName,
    short_name: branding.businessName,
    description: branding.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: branding.primaryColor,
    icons: [
      {
        src: branding.logoPath,
        sizes: "any",
        type: "image/jpeg",
      },
    ],
  };
}
