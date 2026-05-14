import { redirect } from "next/navigation";

import { ChatPanel } from "@/app/(protected)/chat/chat-panel";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirectIfPasswordChangeRequired } from "@/lib/password-change-guard";

export default async function ChatPage() {
  await redirectIfPasswordChangeRequired();

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const initials =
    user.username
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="-mx-4 -my-5 sm:-mx-6 lg:-mx-6">
      <ChatPanel initials={initials} username={user.username} />
    </div>
  );
}
