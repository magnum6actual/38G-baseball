import type { OntologyFullMetadata } from "@osdk/foundry.ontologies";
import _metadata from "../osdk-output/ontology-metadata.json";

export const metadata = _metadata as unknown as OntologyFullMetadata;
