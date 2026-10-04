import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { PlayerCard } from "@/components/picado/player-card";
import { Button } from "@/components/ui/button";
import { buildCard, MIN_RATERS } from "@/lib/cards/build-card";

interface CartaDetailPageProps {
  params: Promise<{ gid: string; uid: string }>;
}

export const metadata: Metadata = {
  title: "Carta · Picado",
};

export default async function CartaDetailPage({
  params,
}: CartaDetailPageProps) {
  const { gid, uid } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get all group cards
  const { data: cardsData, error: cardsError } = await supabase.rpc(
    "get_group_cards",
    { p_group_id: gid }
  );

  if (cardsError) {
    throw new Error("No se pudo cargar la carta.");
  }

  // Find the card for the requested user
  const cardRow = (cardsData || []).find((row) => row.user_id === uid);

  if (!cardRow) {
    notFound();
  }

  // Get last finalized match for MVP determination
  let isMvp = false;
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
      isMvp = mvpSummary[0].mvp_ids?.includes(uid) ?? false;
    }
  }

  const card = buildCard(cardRow, { mvp: isMvp });

  const isCurrentUser = user.id === uid;
  const voteText = card.raters === 1 ? "1 voto" : `${card.raters} votos`;
  const votosFaltantes = Math.max(0, MIN_RATERS - card.raters);

  return (
    <>
      <AppHeader
        title={card.name}
        backHref={`/g/${gid}/cartas`}
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6 space-y-6 flex flex-col items-center">
        {/* Card */}
        <PlayerCard
          name={card.name}
          position={card.position}
          ovr={card.ovr}
          stats={card.stats}
          goalkeeper={card.goalkeeper}
          provisional={card.provisional}
          mvp={card.mvp}
          size="md"
        />

        {/* Votes count */}
        <p className="text-small tabular text-muted-foreground">{voteText}</p>

        {/* Provisional message */}
        {card.provisional && (
          <p className="text-small text-muted-foreground text-center max-w-xs">
            Faltan {votosFaltantes} {votosFaltantes === 1 ? "voto" : "votos"} para
            revelar su carta.
          </p>
        )}

        {/* Current user message */}
        {isCurrentUser && (
          <p className="text-small text-muted-foreground text-center max-w-xs">
            Esta es tu carta. La arman tus compañeros con sus votos.
          </p>
        )}

        {/* Rate button (only for other users) */}
        {!isCurrentUser && (
          <Button
            variant="primary"
            size="md"
            block
            asChild
          >
            <Link href={`/g/${gid}/cartas/${uid}/calificar`}>
              Calificá a {card.name}
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
