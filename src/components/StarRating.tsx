import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} stelle`}
          onClick={() => onChange(n)}
          className={cn(
            "transition-all active:scale-90 hover:scale-110 rounded-full p-0.5",
            n <= value ? "text-gold" : "text-muted-foreground/40",
          )}
        >
          <Star size={size} fill={n <= value ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
