import type { IntelligenceItem } from "@/domain/mission-control";
import type { RankingAssessment, RankingSignal } from "./contracts";

export interface RankableCandidate {
  intelligenceItem: IntelligenceItem;
  assessment: Extract<RankingAssessment, { finalScore: number }>;
}

function signalValue(
  assessment: RankingAssessment,
  factor: RankingSignal["factor"],
): number {
  return assessment.signals.find((signal) => signal.factor === factor)
    ?.normalizedValue ?? -1;
}

export function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left.normalize("NFC"), (character) => character.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right.normalize("NFC"), (character) => character.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] < rightPoints[index] ? -1 : 1;
    }
  }
  return leftPoints.length - rightPoints.length;
}

function descending(left: number, right: number): number {
  return right - left;
}

function publicationTimestamp(item: IntelligenceItem): number {
  const value = Date.parse(item.createdAt);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

export function compareRankedCandidates(
  left: RankableCandidate,
  right: RankableCandidate,
): number {
  return descending(left.assessment.finalScore, right.assessment.finalScore)
    || descending(signalValue(left.assessment, "confidence"), signalValue(right.assessment, "confidence"))
    || descending(signalValue(left.assessment, "evidenceSufficiency"), signalValue(right.assessment, "evidenceSufficiency"))
    || descending(signalValue(left.assessment, "impact"), signalValue(right.assessment, "impact"))
    || descending(publicationTimestamp(left.intelligenceItem), publicationTimestamp(right.intelligenceItem))
    || descending(signalValue(left.assessment, "sourceAuthority"), signalValue(right.assessment, "sourceAuthority"))
    || compareUnicodeCodePoints(left.intelligenceItem.title, right.intelligenceItem.title)
    || compareUnicodeCodePoints(left.intelligenceItem.id, right.intelligenceItem.id);
}

export function rankCandidates(candidates: RankableCandidate[]): RankableCandidate[] {
  return [...candidates].sort(compareRankedCandidates);
}
