import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redirecting",
  robots: "noindex, nofollow",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
