import { AppHeader } from "@/components/layout/app-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function RankingLoading() {
  return (
    <>
      <AppHeader title="Ranking" />
      <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
        <PageSkeleton rows={6} />
      </div>
    </>
  );
}
