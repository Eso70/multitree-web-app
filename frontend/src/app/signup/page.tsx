import type { Metadata } from "next";
import { CreatorAuthPage } from "@/features/creator/CreatorAuthPage";

export const metadata: Metadata = {
  title: "دروستکردنی هەژمار",
  robots: "noindex, nofollow",
};

export default function SignupPage() {
  return <CreatorAuthPage mode="signup" />;
}
