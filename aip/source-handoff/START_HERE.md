# 38G Talent Search — source installation handoff

This is a source-code delivery for installation into the destination Palantir AIP/Foundry enrollment. It is not a Marketplace product. No Marketplace store, Maven coordinate, bundle signing certificate, `foundry register`, or Marketplace import is needed.

The application ports the original search and card-builder screens, components, card schema, and styling. The intended changes are Foundry authentication, profile ownership by immutable Foundry user ID, AIP-backed models/data, printable HTML instead of generated PDF, and original photo upload without image manipulation.

## Contents

- `app/`: React application source, including original UI components and styling.
- `ontology/ontology.mts`: object and Action definitions, including owner enforcement.
- `ontology/CONTRACT.md`: human-readable setup instructions for Ontology Manager / the AIP agent.
- `ontology/sdk/`: generated TypeScript SDK matching the included object API names. The application supplies the destination ontology RID at runtime. Regenerate this SDK if the destination API names or schema differ.
- `original-design/`: reference copies of the original pages, layout, stylesheet, and card components. These are the design baseline, not a second deployable backend.
- `tests/`: behavior checks and explicitly fictional document fixtures.
- `AIP_AGENT_PROMPT.md`: instructions to give the destination AIP agent.
- `INSTALL.md`: concrete installation and direct website-hosting steps.
- `VERIFICATION.md`: verified behavior and remaining destination checks.
- `MANIFEST.sha256`: integrity hashes for all packaged files except the manifest itself.

Start by opening `AIP_AGENT_PROMPT.md` with the destination agent. The optional demo-data/ folder contains the original 20 fictional profiles and their existing generated headshots for acceptance testing. No real personnel records, personal photos, credentials, development account configuration, or node_modules are included. The package requires access to the destination's approved npm registry at build time; browser runtime uses the destination Foundry services only.
