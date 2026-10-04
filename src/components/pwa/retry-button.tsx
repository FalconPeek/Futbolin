"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Button onClick={handleRetry} className="px-6">
      Reintentar
    </Button>
  );
}
