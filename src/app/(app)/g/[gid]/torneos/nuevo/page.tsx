import { type Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { TournamentForm } from "@/components/tournaments/tournament-form";

interface NuevoTorneoPageProps {
  params: Promise<{ gid: string }>;
}

export const metadata: Metadata = {
  title: "Nuevo torneo · Picado",
};

export default async function NuevoTorneoPage({
  params,
}: NuevoTorneoPageProps) {
  const { gid } = await params;

  return (
    <>
      <AppHeader
        title="Nuevo torneo"
        backHref={`/g/${gid}/torneos`}
      />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-6">
        <TournamentForm groupId={gid} />
      </div>
    </>
  );
}
