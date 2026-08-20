import type { Metadata } from "next";
import { CreatorAuthPage } from "@/features/creator/CreatorAuthPage";

export const metadata: Metadata = {
  title: "دروستکردنی هەژماری Creator",
  robots: "noindex, nofollow",
};

export default function SignupPage() {
  return <CreatorAuthPage mode="signup" />;
}
