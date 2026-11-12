import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";

/** Foto do prato ou placeholder neutro quando ainda não há imagem cadastrada. */
export function FoodImage({
  src,
  alt,
  className = "",
  sizes = "(min-width: 768px) 33vw, 100vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={`Sem foto: ${alt}`}
        className={`bg-sand text-charcoal/40 flex items-center justify-center ${className}`}
      >
        <UtensilsCrossed aria-hidden className="size-8" />
      </div>
    );
  }
  return (
    <div className={`bg-sand relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
