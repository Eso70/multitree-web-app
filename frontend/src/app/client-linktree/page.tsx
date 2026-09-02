import type { Metadata } from "next";
import ClientLinktreeAccessPage from "@/features/client-linktree-access/components/ClientLinktreeAccessPage";

export const metadata: Metadata = {
  title: "دروستکردنی پەڕەی لینکتری | MultiTree",
  robots: { index: false, follow: false },
};

export default function ClientLinktreePage() {
  return <ClientLinktreeAccessPage />;
}
