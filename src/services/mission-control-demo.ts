import { IntelligenceItemSchema, type IntelligenceItem } from "@/domain/mission-control";

const DEMO_CREATED_AT = "2026-01-05T09:00:00.000Z";

const preparedItems: IntelligenceItem[] = [
  { id: "demo-model-release", title: "Prepared sample: a new multimodal model release", summary: "A prepared sample record showing how a model release can be compared with other trusted intelligence during a weekly review.", sourceName: "AI Radar prepared sample", sourceDefinitionId: "demo-source", category: "Major model release", impactScore: 94, confidenceScore: 92, evidenceCount: 4, verificationStatus: "verified", editorialStatus: "approved", whyRanked: ["High expected ecosystem impact", "Multiple evidence references", "Strong confidence score"], createdAt: DEMO_CREATED_AT },
  { id: "demo-safety", title: "Prepared sample: practical AI safety and security guidance", summary: "A prepared sample record for safety guidance that helps operators track risk-reduction work without presenting an unverified claim as live news.", sourceName: "AI Radar prepared sample", sourceDefinitionId: "demo-source", category: "AI safety and security", impactScore: 89, confidenceScore: 95, evidenceCount: 5, verificationStatus: "verified", editorialStatus: "approved", whyRanked: ["High confidence", "Direct relevance to safe deployment", "Evidence depth"], createdAt: DEMO_CREATED_AT },
  { id: "demo-enterprise", title: "Prepared sample: enterprise AI workflow adoption", summary: "A prepared sample record illustrating an enterprise adoption signal that can be assessed for practical value and editorial relevance.", sourceName: "AI Radar prepared sample", sourceDefinitionId: "demo-source", category: "Enterprise AI", impactScore: 82, confidenceScore: 86, evidenceCount: 3, verificationStatus: "verified", editorialStatus: "pending", whyRanked: ["Meaningful business relevance", "Clear implementation signal"], createdAt: DEMO_CREATED_AT },
  { id: "demo-policy", title: "Prepared sample: AI policy and regulation update", summary: "A prepared sample record showing where policy developments enter the review queue before a human publishing decision.", sourceName: "AI Radar prepared sample", sourceDefinitionId: "demo-source", category: "Regulation and policy", impactScore: 78, confidenceScore: 88, evidenceCount: 3, verificationStatus: "verified", editorialStatus: "rejected", whyRanked: ["Policy relevance", "High confidence but not selected for this report"], createdAt: DEMO_CREATED_AT },
  { id: "demo-education", title: "Prepared sample: AI and human potential in education", summary: "A prepared sample record for education and human-potential signals, retained as a transparent example for editorial review.", sourceName: "AI Radar prepared sample", sourceDefinitionId: "demo-source", category: "Education and human potential", impactScore: 74, confidenceScore: 84, evidenceCount: 2, verificationStatus: "verified", editorialStatus: "approved", whyRanked: ["Human-centered relevance", "Useful cross-domain perspective"], createdAt: DEMO_CREATED_AT },
];

export function getDemoIntelligenceItems(): IntelligenceItem[] {
  return preparedItems.map((item) => IntelligenceItemSchema.parse({ ...item, whyRanked: item.whyRanked ? [...item.whyRanked] : undefined }));
}

export function isDemoModeEnabled() { return process.env.AI_RADAR_DEMO_MODE === "true"; }
