import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Workspace Access",
  description: "چوونەژوورەوە بۆ بەڕێوەبردنی بزنس",
  robots: "noindex, nofollow",
};

export default function BusinessWorkspaceEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
