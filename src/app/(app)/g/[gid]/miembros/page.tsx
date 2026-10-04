import { type Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { InviteLink } from "@/components/groups/invite-link";
import { MembersList } from "@/components/groups/members-list";

interface MiembrosPageProps {
  params: Promise<{ gid: string }>;
}

export const metadata: Metadata = {
  title: "Miembros · Picado",
};

export default async function MiembrosPage({ params }: MiembrosPageProps) {
  const { gid } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get group
  const { data: group } = await supabase
    .from("groups")
    .select("name, invite_code")
    .eq("id", gid)
    .maybeSingle();

  if (!group) {
    return null;
  }

  // Get current user's role
  const { data: currentUserMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", gid)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = currentUserMembership?.role === "admin";

  // Get members
  const { data: membersData } = await supabase
    .from("group_members")
    .select(
      `
      user_id,
      role,
      profiles (
        display_name,
        nickname,
        position
      )
    `
    )
    .eq("group_id", gid)
    .order("profiles.display_name", { ascending: true });

  const members = (membersData || []).map((member) => ({
    userId: member.user_id,
    name: member.profiles?.nickname || member.profiles?.display_name || "Jugador",
    position: member.profiles?.position,
    role: member.role as "admin" | "member",
  }));

  return (
    <>
      <AppHeader title="Miembros" backHref={`/g/${gid}`} />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6 space-y-6">
        <Card title="Invitá a tus amigos">
          <InviteLink code={group.invite_code} />
        </Card>

        <MembersList
          groupId={gid}
          members={members}
          currentUserId={user.id}
          isAdmin={isAdmin}
        />
      </div>
    </>
  );
}
