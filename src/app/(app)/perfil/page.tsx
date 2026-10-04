import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tu perfil · Picado",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    return null;
  }

  return (
    <>
      <AppHeader title="Tu perfil" backHref="/grupos" />
      <main className="mx-auto w-full max-w-screen-sm px-4 py-4 flex flex-col gap-4 pb-nav">
        <Card>
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-small text-muted-foreground">{user.email}</p>
          </div>
          <ProfileForm
            defaultValues={{
              display_name: profile.display_name,
              nickname: profile.nickname || "",
              position: profile.position,
            }}
          />
        </Card>

        <Card>
          <SignOutButton />
        </Card>
      </main>
    </>
  );
}
