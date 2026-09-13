import { TalentSettings } from "@ontology/sdk";
import { createSeed } from "./$createSeed.mjs";
export default createSeed(seed => seed.create(TalentSettings, {id: "default", model: "ri.language-model-service..language-model.gpt-5-2"}));
