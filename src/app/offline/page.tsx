import { WifiOff } from "lucide-react";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata = {
  title: "Sin conexión · Picado",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <WifiOff className="size-8 text-muted-foreground" />
        <div className="flex flex-col gap-2">
          <h1 className="text-title-lg font-semibold text-foreground">Estás sin conexión</h1>
          <p className="text-body text-muted-foreground">Revisá tu conexión y probá de nuevo.</p>
        </div>
        <RetryButton />
      </div>
    </div>
  );
}
