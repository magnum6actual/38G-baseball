import { createSeedWithMetadata, SeedFunction } from "@osdk/seed-helpers";
import { metadata } from "./$metadata";

export const createSeed = <T,>(seedFn: SeedFunction<T>) =>
  createSeedWithMetadata(metadata, seedFn);
