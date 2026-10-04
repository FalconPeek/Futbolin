import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { TeamPicker } from "@/components/matches/team-picker";
import { computeOvr } from "@/lib/cards/ovr";

interface EquiposPageProps {
  params: Promise<{
    gid: string;
    mid: string;
  }>;
}

export const metadata: Metadata = {
  title: "Armar equipos · Picado",
};

export default async function EquiposPage({ params }: EquiposPageProps) {
  const { gid, mid } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/ingresar?next=/g/${gid}/partidos/${mid}/equipos`);
  }

  // Get match data
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, group_id, status, created_by")
    .eq("id", mid)
    .eq("group_id", gid)
    .single();

  if (matchError || !match) {
    notFound();
  }

  // Check if user is group admin or match creator
  const { data: adminData } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", gid)
    .eq("user_id", user.id)
    .single();

  const isAdmin = adminData?.role === "admin";
  const isOrganizer = match.created_by === user.id;

  if (!isAdmin && !isOrganizer) {
    redirect(`/g/${gid}/partidos/${mid}`);
  }

  // Check if match is in programado status
  if (match.status !== "programado") {
    redirect(`/g/${gid}/partidos/${mid}`);
  }

  // Get confirmed players
  const { data: playersData, error: playersError } = await supabase
    .from("match_players")
    .select("user_id, team, attendance")
    .eq("match_id", mid)
    .eq("attendance", "confirmado");

  if (playersError || !playersData) {
    notFound();
  }

  // Check if there are at least 2 confirmed players
  if (playersData.length < 2) {
    return (
      <div className="min-h-screen bg-background pb-nav">
        <AppHeader
          title="Armar equipos"
          backHref={`/g/${gid}/partidos/${mid}`}
        />
        <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
          <div className="text-center space-y-4">
            <p className="text-body text-foreground">
              Hacen falta al menos 2 confirmados para armar equipos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get group cards for OVR calculation
  const { data: cardsData, error: cardsError } = await supabase.rpc(
    "get_group_cards",
    { p_group_id: gid }
  );

  if (cardsError) {
    notFound();
  }

  // Map players with their OVRs
  const players = playersData.map((p) => {
    const card = cardsData?.find((c) => c.user_id === p.user_id);

    let ovr: number | null = null;
    if (card && card.raters >= 3 && [card.s1, card.s2, card.s3, card.s4, card.s5, card.s6].every((s) => s !== null)) {
      ovr = computeOvr(card.position, [card.s1, card.s2, card.s3, card.s4, card.s5, card.s6]);
    }

    return {
      userId: p.user_id,
      name: card?.nickname || card?.display_name || "Jugador",
      position: card?.position || "MC",
      ovr,
      team: (p.team as "A" | "B" | null) || null,
    };
  });

  return (
    <div className="min-h-screen bg-background pb-nav">
      <AppHeader
        title="Armar equipos"
        backHref={`/g/${gid}/partidos/${mid}`}
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
        <TeamPicker
          matchId={mid}
          groupId={gid}
          players={players}
        />
      </div>
    </div>
  );
}
