import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User Dashboard | MultiTree",
  robots: "noindex, nofollow, noarchive",
};

export default function CreatorAccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
