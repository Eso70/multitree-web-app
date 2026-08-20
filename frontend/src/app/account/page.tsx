import type { Metadata } from "next";
import { CreatorDashboard } from "@/features/creator/CreatorDashboard";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  robots: "noindex, nofollow",
};

export default function CreatorAccountPage() {
  return <CreatorDashboard />;
}
