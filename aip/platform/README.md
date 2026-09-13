# 38G Talent Search — faithful AIP source port

The application uses the original search/builder pages, shared UI components, baseball-card structure, and black/gold stylesheet. Backend connections use Foundry objects/Actions and AIP. Foundry user IDs control ownership; the server-side modify Action compares the existing owner to the authenticated user.

The user requested source delivery and direct installation, not Marketplace. The authoritative installation instructions are in `../source-handoff/`. Generate the source ZIP with `python3 ../package-source.py` from this directory. The archive is written to `../delivery/38g-talent-source.zip` and includes the AIP-agent prompt, installation guide, ontology contract, generated SDK, original UI references, tests, and integrity manifest. The package script deliberately excludes development credentials, Marketplace configuration, node_modules, and enrollment configuration. Optional fictional demo records and their existing photos are included separately.

## Local development

A fresh checkout can build the portable app with `python3 aip/package-source.py` followed by `npm ci` in `../delivery/38g-talent-source/app`. The older SuperRepo simulator commands below require a separately configured developer enrollment; its enrollment-specific files and Marketplace CI are intentionally not committed.

`python3 ../scripts/restore-preview-photos.py` materializes the fictional seed and its headshots from versioned source files. Run it before starting the simulator. `foundry install pnpm` installs this development workspace through its configured enrollment registry. `pnpm run dev` runs the local app and ontology preview on http://localhost:8080/search. `cd app && pnpm run typecheck` and `pnpm run lint` check the source. `node --experimental-strip-types --test tests/port.test.mjs` runs the focused behavior tests from this directory.

The local simulator uses fictional seed officers. Current-user and AIP calls use the authenticated developer enrollment. Its Actions do not provide an authenticated current-user context, so draft building/editing and HTML preview export work but server-side publishing is not claimed as verified locally. The portable source package uses real destination OAuth and does not use this simulator.

## User-facing workflows

- Conversational search: streamed Markdown responses, previous-turn context, ranked primary team, separate alternatives, mobile tabs, and officer detail dialogs.
- Card builder: document uploads (TXT/MD/PDF/DOC/DOCX), retained document context, AIP interview, sequential extraction, full-schema live inline editing, and manual-edit preservation.
- Profile ownership: current-user identity, own-profile selection/editing, server-derived create ownership, and owner-enforcing modify Actions.
- Export: standalone HTML using the original card layout; browser printing; optional original-photo upload with no manipulation.

Destination publication uses Developer Console website hosting. The older SuperRepo/Marketplace configuration remains only in the original local workspace and is excluded from Git and source delivery. Do not use its signing path as an installation prerequisite. Read `../source-handoff/VERIFICATION.md` for evidence and outstanding destination acceptance checks.
