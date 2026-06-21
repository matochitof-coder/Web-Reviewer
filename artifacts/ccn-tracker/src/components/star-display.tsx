import { Star, StarHalf } from "lucide-react";

export function StarDisplay({ count, max = 3, className = "" }: { count?: number | null; max?: number; className?: string }) {
  if (count === null || count === undefined) return null;
  
  const stars = [];
  const fullStars = Math.floor(count);
  const hasHalfStar = count % 1 !== 0;
  
  for (let i = 0; i < max; i++) {
    if (i < fullStars) {
      stars.push(
        <Star 
          key={i} 
          className={`w-4 h-4 fill-yellow-500 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)] ${className}`} 
        />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <StarHalf 
          key={i} 
          className={`w-4 h-4 fill-yellow-500 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)] ${className}`} 
        />
      );
    } else {
      stars.push(
        <Star 
          key={i} 
          className={`w-4 h-4 text-muted border-muted-foreground/20 ${className}`} 
        />
      );
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}
