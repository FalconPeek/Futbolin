import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/grupos");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col justify-between px-4 py-8">
      <div />

      <div className="flex flex-col items-center gap-6">
        <h1 className="font-display text-display font-bold text-center">
          Picado
        </h1>
        <p className="text-center text-muted-foreground">
          Organizá el fútbol con tus amigos: partidos, cartas votadas, ranking y
          torneos.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-6">
        <Button size="lg" block asChild>
          <Link href="/ingresar">Ingresá</Link>
        </Button>
        <Button variant="secondary" size="lg" block asChild>
          <Link href="/registrarme">Creá tu cuenta</Link>
        </Button>
      </div>
    </main>
  );
}
