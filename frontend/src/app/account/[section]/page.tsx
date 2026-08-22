import { notFound } from "next/navigation";
import { CreatorDashboard } from "@/features/creator/CreatorDashboard";

export default async function CreatorAccountSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["linktree", "mini-website", "templates", "settings"].includes(section))
    notFound();
  return <CreatorDashboard />;
}
