import { AppHeader } from "@/components/layout/app-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ProfileLoading() {
  return (
    <>
      <AppHeader title="Tu perfil" backHref="/grupos" />
      <main className="mx-auto w-full max-w-screen-sm px-4 py-4 pb-nav">
        <PageSkeleton rows={3} />
      </main>
    </>
  );
}
