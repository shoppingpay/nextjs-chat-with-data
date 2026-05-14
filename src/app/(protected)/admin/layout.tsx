import { redirect } from "next/navigation";

import { requireAdminPageUser } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await requireAdminPageUser();

  if (!admin) {
    redirect("/home");
  }

  return children;
}
