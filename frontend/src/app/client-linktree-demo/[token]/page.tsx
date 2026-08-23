import type { Metadata } from "next";
import ClientInvitationEditorDemo from "@/features/client-linktree-access/components/ClientInvitationEditorDemo";

export const metadata: Metadata = {
  title: "تاقیکردنەوەی دەستگەیشتنی کاتی کڕیار | MultiTree",
  robots: { index: false, follow: false },
};

export default async function ClientLinktreeDemoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientInvitationEditorDemo token={token} />;
}
