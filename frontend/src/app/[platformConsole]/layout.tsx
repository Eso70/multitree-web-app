import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Admin | MultiTree",
  robots: "noindex, nofollow",
  icons: {
    icon: "/favicon.ico",
  },
};

function configuredConsoleSegment(): string | null {
  const segment = (process.env.PLATFORM_ADMIN_PATH || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!/^[a-zA-Z0-9_-]{20,}$/.test(segment)) {
    return process.env.NODE_ENV === "development" ? "platform-console" : null;
  }

  return segment;
}

export default async function PlatformConsoleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ platformConsole: string }>;
}) {
  const { platformConsole } = await params;
  if (platformConsole !== configuredConsoleSegment()) {
    notFound();
  }

  return <>{children}</>;
}
