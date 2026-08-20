import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreatorAuthPage } from "@/features/creator/CreatorAuthPage";

export default async function LoginPage() {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() || "";
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost")
    .split(":")[0]
    .toLowerCase();
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const isRoot =
    !host ||
    isIp ||
    host === "localhost" ||
    host === root ||
    host === `www.${root}`;
  if (isRoot) return <CreatorAuthPage mode="login" />;
  redirect("/business/login");
}
