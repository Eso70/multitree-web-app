import { PlatformAdminDashboard } from "@/features/platform-admin/components/PlatformAdminDashboard";
import { isPlatformPage } from "@/features/platform-admin/platform-pages";
import { notFound } from "next/navigation";

export default async function PlatformConsolePage({
  params,
}: {
  params: Promise<{ consolePath?: string[] }>;
}) {
  const { consolePath = [] } = await params;
  if (
    consolePath.length > 1 ||
    (consolePath[0] !== undefined && !isPlatformPage(consolePath[0]))
  ) {
    notFound();
  }

  return <PlatformAdminDashboard />;
}
