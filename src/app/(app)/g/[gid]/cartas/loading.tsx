import { AppHeader } from "@/components/layout/app-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function CartasLoading() {
  return (
    <>
      <AppHeader title="Cartas" />
      <PageSkeleton rows={4} />
    </>
  );
}
