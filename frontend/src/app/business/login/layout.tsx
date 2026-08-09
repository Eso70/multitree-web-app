import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Login",
  description: "چوونەژوورەوە بۆ بەڕێوەبردنی بزنس",
  robots: "noindex, nofollow",
};

export default function BusinessLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
