"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";

interface InviteLinkProps {
  code: string;
}

export function InviteLink({ code }: InviteLinkProps) {
  const [isPending, startTransition] = useTransition();

  const url = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/unirse/${code}`,
    [code]
  );

  const canShare = useMemo(
    () => typeof navigator !== "undefined" && !!navigator.share,
    []
  );

  const handleCopy = () => {
    if (!url) return;
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Copiamos el link.");
      } catch {
        toast.error("No se pudo copiar el link.");
      }
    });
  };

  const handleShare = () => {
    if (!url || !navigator.share) return;
    startTransition(async () => {
      try {
        await navigator.share({
          title: "Picado",
          text: "Sumate a nuestro grupo en Picado",
          url,
        });
      } catch (error) {
        // Ignore if user cancels
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        toast.error("No se pudo compartir.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="bg-card border border-input rounded-md p-3">
        <p className="text-caption text-muted-foreground mb-2">Código</p>
        <p className="font-display text-score tabular text-foreground">
          {code}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleCopy}
          disabled={isPending || !url}
          className="flex-1"
        >
          <Copy className="size-5 mr-2" />
          Copiar link
        </Button>
        {canShare && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleShare}
            disabled={isPending || !url}
          >
            <Share2 className="size-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
