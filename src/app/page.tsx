import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getCurrentSession();

  redirect(session ? "/home" : "/login");
}
