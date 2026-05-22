import type { Priority } from '@/types';

export interface WeaknessResult {
  score: number;
  reasons: string[];
}

export function scoreWeakness(
  website: string | null,
  rating: number | null,
  totalRatings: number | null
): WeaknessResult {
  let score = 0;
  const reasons: string[] = [];

  if (!website) {
    score += 5;
    reasons.push('Sie noch keine eigene Website haben');
  }

  const ratings = totalRatings ?? 0;
  const stars = rating ?? 0;

  if (ratings < 5) {
    score += 3;
    reasons.push('Sie kaum Bewertungen auf Google haben');
  } else if (ratings < 20) {
    score += 2;
    reasons.push('Sie nur wenige Google-Bewertungen haben');
  } else if (ratings < 50) {
    score += 1;
  }

  if (stars > 0 && stars < 3.5) {
    score += 2;
    reasons.push('Ihre Google-Bewertung noch verbessert werden kann');
  } else if (stars >= 3.5 && stars < 4.0) {
    score += 1;
  }

  if (reasons.length === 0) {
    reasons.push('Ihre Online-Präsenz noch weiter ausgebaut werden kann');
  }

  return { score: Math.min(score, 10), reasons };
}

export function getPriority(score: number): Priority {
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}
