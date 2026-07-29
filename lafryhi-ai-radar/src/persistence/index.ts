import type { RadarRepository } from "./repository";
import { resolvePersistenceAdapter } from "@/services/runtime-config";

let repository: RadarRepository | undefined;
export async function getRepository(): Promise<RadarRepository> {
  if (repository) return repository;
  const adapter = resolvePersistenceAdapter();
  if (adapter === "firestore") {
    const { FirestoreRepository } = await import("./firestore");
    repository = new FirestoreRepository();
  } else if (adapter === "memory") {
    const { MemoryRepository } = await import("./memory");
    repository = new MemoryRepository();
  } else {
    const { LocalFileRepository } = await import("./local");
    repository = new LocalFileRepository(process.env.LOCAL_DATA_PATH || ".data/radar.json");
  }
  console.info(JSON.stringify({ event: "persistence.adapter_selected", adapter }));
  return repository;
}
