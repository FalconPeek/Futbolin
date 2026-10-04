import { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Crear cuenta · Picado",
  description: "Creá tu cuenta de Picado.",
};

interface Registrarme {
  searchParams: Promise<{ next?: string }>;
}

export default async function Registrarme({ searchParams }: Registrarme) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col items-center justify-center px-4">
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="font-display text-display font-bold mb-4">Picado</h1>
          <h2 className="text-title-lg">Creá tu cuenta</h2>
        </div>

        <Card>
          <AuthForm mode="signup" next={next} />
        </Card>
      </div>
    </main>
  );
}
