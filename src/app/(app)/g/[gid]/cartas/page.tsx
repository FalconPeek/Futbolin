import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { CardGallery } from "@/components/cards/card-gallery";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { buildCard, sortCards } from "@/lib/cards/build-card";
import { Users } from "lucide-react";

interface CartasPageProps {
  params: Promise<{ gid: string }>;
}

export const metadata: Metadata = {
  title: "Cartas · Picado",
};

export default async function CartasPage({ params }: CartasPageProps) {
  const { gid } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get group (for validation)
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", gid)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  // Get group members count
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", gid);

  // If only one member (current user), show empty state
  if (memberCount === 1) {
    return (
      <>
        <AppHeader title="Cartas" backHref={`/g/${gid}`} />
        <EmptyState
          icon={Users}
          title="Todavía no hay compañeros para calificar"
          action={
            <Button asChild>
              <Link href={`/g/${gid}/miembros`}>Invitá a tus amigos</Link>
            </Button>
          }
        />
      </>
    );
  }

  // Get all group cards
  const { data: cardsData, error: cardsError } = await supabase.rpc(
    "get_group_cards",
    { p_group_id: gid }
  );

  if (cardsError) {
    throw new Error("No se pudieron cargar las cartas.");
  }

  // Get last finalized match for MVP determination
  let mvpIds: string[] = [];
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", gid)
    .eq("status", "finalizado")
    .order("finalized_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMatch) {
    const { data: mvpSummary } = await supabase.rpc("get_match_mvp_summary", {
      p_match_id: lastMatch.id,
    });

    if (mvpSummary && mvpSummary.length > 0 && mvpSummary[0].closed) {
      mvpIds = mvpSummary[0].mvp_ids || [];
    }
  }

  // Build and sort cards
  const builtCards = (cardsData || []).map((row) =>
    buildCard(row, { mvp: mvpIds.includes(row.user_id) })
  );
  const sortedCards = sortCards(builtCards);

  return (
    <>
      <AppHeader title="Cartas" backHref={`/g/${gid}`} />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-4 text-small text-muted-foreground">
        Las cartas salen de los votos de tus compañeros. Con 3 votos se revela
        la carta.
      </div>
      <CardGallery groupId={gid} cards={sortedCards} />
    </>
  );
}
