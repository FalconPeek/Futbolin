import { AppHeader } from "@/components/layout/app-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function MiembrosLoading() {
  return (
    <>
      <AppHeader title="Miembros" />
      <PageSkeleton rows={5} />
    </>
  );
}
