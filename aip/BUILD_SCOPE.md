# 38G Talent Search — AIP source release

Port the original application design and UX to Foundry Ontology and AIP. Preserve conversational search, every mentioned officer in the correct result group, original headshots, full officer details, the document-assisted editable card builder, and the complete profile schema. Add immutable Foundry user IDs and server-side owner validation. Use printable HTML instead of generated PDFs; do not add photo generation or manipulation.

Delivery is a source ZIP with destination AIP-agent installation instructions. Marketplace, signing certificates, and automatic Foundry deployment are not part of this release. GitHub release tags use vMAJOR.MINOR.PATCH and identify the reviewed source, not a deployed Army installation.

The root Next.js app is the historical implementation. Release source lives in platform/app and platform/ontology/src. source-handoff contains destination instructions, locked portable dependencies, the generated SDK snapshot, and the reviewed original UI reference. demo-data contains only the original 20 fictional officers with their existing generated photos; never silently import these into a production personnel roster.

Acceptance includes clean package installation, typecheck, lint, tests, build, complete search references and photos, and the destination checks in source-handoff/VERIFICATION.md. Hosted OAuth, real Action save/reload and two-user ownership enforcement must be verified in the destination before calling it installed.
