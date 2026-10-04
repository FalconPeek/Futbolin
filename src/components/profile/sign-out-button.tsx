"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      const result = await signOut();

      if (result.ok) {
        router.push(result.data.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <Button variant="secondary" block onClick={handleSignOut} disabled={isPending}>
      <LogOut />
      Salir de la cuenta
    </Button>
  );
}
