import Link from "next/link";
import { PlayerCard } from "@/components/picado/player-card";
import type { BuiltCard } from "@/lib/cards/build-card";

interface CardGalleryProps {
  groupId: string;
  cards: BuiltCard[];
}

export function CardGallery({ groupId, cards }: CardGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mx-auto w-full max-w-screen-sm px-4 py-6 justify-items-center">
      {cards.map((card) => (
        <Link
          key={card.userId}
          href={`/g/${groupId}/cartas/${card.userId}`}
          aria-label={`Ver la carta de ${card.name}`}
          className="rounded-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlayerCard
            name={card.name}
            position={card.position}
            ovr={card.ovr}
            stats={card.stats}
            goalkeeper={card.goalkeeper}
            provisional={card.provisional}
            mvp={card.mvp}
            size="sm"
          />
        </Link>
      ))}
    </div>
  );
}
