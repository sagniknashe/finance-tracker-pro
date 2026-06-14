import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth/guards";

/** Entry point: route to the dashboard when signed in, else to login. */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
