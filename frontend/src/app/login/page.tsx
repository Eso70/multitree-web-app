import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function LoginPage() {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() || "";
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost").split(":")[0].toLowerCase();
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const isRoot = !host || isIp || host === "localhost" || host === root || host === `www.${root}`;
  if (isRoot) notFound();
  redirect("/business/login");
}
