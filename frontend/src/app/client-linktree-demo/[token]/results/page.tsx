import type { Metadata } from "next";
import ClientResultsDemoPage from "@/features/client-linktree-access/components/ClientResultsDemoPage";

export const metadata: Metadata = {
  title: "تاقیکردنەوەی ئەنجامەکانی کڕیار | MultiTree",
  robots: { index: false, follow: false },
};

export default async function ClientLinktreeResultsDemoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientResultsDemoPage token={token} />;
}
