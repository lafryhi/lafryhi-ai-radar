import type { RadarRepository } from "./repository";

let repository: RadarRepository | undefined;
export async function getRepository(): Promise<RadarRepository> {
  if (repository) return repository;
  if (process.env.PERSISTENCE_ADAPTER === "firestore") {
    const { FirestoreRepository } = await import("./firestore");
    repository = new FirestoreRepository();
  } else {
    const { LocalFileRepository } = await import("./local");
    repository = new LocalFileRepository(process.env.LOCAL_DATA_PATH || ".data/radar.json");
  }
  return repository;
}
