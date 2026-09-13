# Ontology

`src/ontology.mts` is the entry point for ontology-as-code. The starter keeps the complete example in that file: one object type, one plain action, and one function-backed action.

The local development server watches this file and regenerates `osdk-output/` after every change. Never edit generated OSDK files directly.

## Import existing entities

Use the **Ontology Imports** panel in the Palantir VS Code extension, or run the command it provides:

```bash
foundry import ontology \
  --ontology-rid ri.ontology.main.ontology.<uuid> \
  --objects YourObjectApiName
```

The command updates `external-imports/ontology-full-metadata.json`. The ontology build turns that metadata into import stubs under `src/generated-imports/`, where they can be referenced by `ontology.mts`.

For a first change, add a property to `TutorialTask` in `src/ontology.mts`, save, and watch the `ontology:dev` process regenerate the SDK. The app refreshes itself, so you never need to reload it by hand. That is section 1 of the tutorial the app renders.
