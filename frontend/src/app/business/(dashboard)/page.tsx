import { redirect } from "next/navigation";

/**
 * The business console has no overview page. `/business` stays the address the
 * login handoff and the onboarding flow send people to, and forwards to the
 * first real section so every page keeps exactly one canonical URL.
 */
export default function BusinessPage() {
  redirect("/business/pages");
}
