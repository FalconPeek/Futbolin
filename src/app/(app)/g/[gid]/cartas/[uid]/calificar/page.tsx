import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { RatingForm } from "@/components/cards/rating-form";
import { ratingKind } from "@/lib/cards/positions";

interface RatingPageProps {
  params: Promise<{ gid: string; uid: string }>;
}

export const metadata: Metadata = {
  title: "Calificar · Picado",
};

export default async function RatingPage({ params }: RatingPageProps) {
  const { gid, uid } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Prevent self-rating
  if (user.id === uid) {
    redirect(`/g/${gid}/cartas/${uid}`);
  }

  // Get the card data for the rated user
  const { data: cardsData, error: cardsError } = await supabase.rpc(
    "get_group_cards",
    { p_group_id: gid }
  );

  if (cardsError) {
    throw new Error("No se pudo cargar la carta.");
  }

  const cardRow = (cardsData || []).find((row) => row.user_id === uid);

  if (!cardRow) {
    notFound();
  }

  // Get the current user's previous rating (if any)
  const { data: prevRating } = await supabase
    .from("player_ratings")
    .select("kind, s1, s2, s3, s4, s5, s6")
    .eq("group_id", gid)
    .eq("rated_id", uid)
    .eq("rater_id", user.id)
    .maybeSingle();

  // If the kind has changed, ignore the previous rating
  const kind = ratingKind(cardRow.position);
  const initial =
    prevRating && prevRating.kind === kind
      ? [
          prevRating.s1,
          prevRating.s2,
          prevRating.s3,
          prevRating.s4,
          prevRating.s5,
          prevRating.s6,
        ]
      : null;

  const ratedName = cardRow.nickname || cardRow.display_name;

  return (
    <>
      <AppHeader
        title={`Calificá a ${ratedName}`}
        backHref={`/g/${gid}/cartas/${uid}`}
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6 pb-nav">
        <RatingForm
          groupId={gid}
          ratedId={uid}
          kind={kind}
          initial={initial}
        />
      </div>
    </>
  );
}
