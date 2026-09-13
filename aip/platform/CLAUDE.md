# Current delivery scope

The user selected portable source delivery and explicitly rejected Marketplace deployment. This repository's GitHub releases use vMAJOR.MINOR.PATCH and do not run Foundry publishing. The historical SuperRepo publishing instructions below apply only to a separately configured simulator workspace; do not use them as release or installation requirements. See ../BUILD_SCOPE.md and ../source-handoff/INSTALL.md for current delivery instructions.

# CLAUDE.md

## Foundry concepts

- **Ontology**: the data model layer that defines the structure and relationships of every entity in the project.
- **Object types**: entity definitions with typed properties and a primary key, the building blocks of the ontology.
- **Properties**: typed fields on an object type (string, integer, double, and so on).
- **Links**: typed relationships between object types. A one-to-many link is carried by a foreign key property on the many side.
- **Actions**: the only way to write to the ontology. Either generated from an object type, or backed by a function.
- **Functions**: server-side business logic in TypeScript. A function returns edits; an action applies them.
- **OSDK**: the generated TypeScript client for querying objects and calling actions and functions.

## What makes this a SuperRepo

`foundry.yml` lists the components that version and deploy together. The ontology, the functions and the app live in one repository and ship as one unit, so a change that spans all three is a single commit and a single deploy.

The generated OSDK is what joins them. Editing `ontology/src/ontology.mts` regenerates it in place, so functions and app code see new types immediately with nothing published to a registry.

Deployment is triggered by tagging the repository, which Foundry CI picks up. Tags must be exactly `MAJOR.MINOR.PATCH`.

## Repository structure

- `ontology/src/ontology.mts` is the single source of truth for object types, links and actions.
- `ontology/seed/` holds local development data. It is loaded into the local ontology only and is never deployed.
- `functions/typescript-functions/src/functions/` holds server-side logic.
- `app/` is a React (Vite) frontend consuming the OSDK through `@osdk/react`.
- `app/src/tutorial/` is the guided tutorial the app renders. It is self-contained, so delete it once you start building your own app.
- `ontology/osdk-output/` and `ontology/src/generated-imports/` are generated. Never edit them directly.

When adding a feature, follow the dependency order: ontology, then function, then action, then app.

## Commands

Orchestration is Nx targets, defined in the root and per-component `project.json`.

- `foundry login` authenticates with Foundry, and needs a real user.
- `foundry install pnpm` installs every sub-project. A bare `pnpm install` cannot resolve the Foundry registry.
- `pnpm run dev` starts the app, ontology and functions dev servers. Use `pnpm run dev:windows` on Windows.
- `pnpm run build` produces the deployable bundle.
- `pnpm run configure` resolves the deploy target and writes `env.yml`. Needed once before the first deploy.
- `cd app && pnpm run typecheck` type-checks the frontend. Also chained into `app`'s `build`.
- `cd app && pnpm run lint` or `pnpm run lint:fix` lints the frontend.

## Dev servers

| Service | Reload behaviour |
|---|---|
| App (Vite) | Hot module reload. |
| Ontology server | Watches `ontology.mts` and regenerates the OSDK. Watches `seed/` and does an in-process wipe and re-seed. |
| TypeScript functions runtime | Reloads on change. |

The app listens on http://localhost:8080. The backend services bind ephemeral ports and publish their URLs to `.palantir/.<service>-discovery.json`, which the Vite proxy and the platform API proxy read.

A re-seed replaces the data without restarting the ontology process, so nothing in the app's module graph changes and Vite has no reason to reload. `seedReloadPlugin` in `app/vite.config.ts` closes that gap: it watches `ontology/osdk-output/seed-data.json`, which is written at the end of a re-seed, and sends a full reload. Do not point it at `seed/*.mts`, which changes about a second before the new data is live.

## Idioms (`@osdk/react`)

In React components always use `@osdk/react` hooks rather than calling `client(...)` by hand. The hooks cache, deduplicate and surface errors.

```ts
// Read a page of objects.
const { data, isLoading } = useOsdkObjects(task, { pageSize: 50 });

// Read a single object by primary key.
const { object } = useOsdkObject(task, pk);

// Traverse a link from an object instance.
const { links } = useLinks(worker, "assignedTasks", { pageSize: 50 });

// Apply an action, whether plain or function-backed.
const createAction = useOsdkAction(createTaskAction);
await createAction.applyAction({ id, title, status: "To do" });

// Call a read-only function directly, no action needed.
const { data } = useOsdkFunction(someQuery, { params: { task } });

// Telemetry. Mount once near the OSDK provider.
useRegisterUserAgent("superrepo-tutorial-template/0.0.0");
```

Do not hand-roll `useState` plus `useEffect` for OSDK reads. The hooks already do it correctly.

This project deliberately does not use `$optimisticUpdate`. `OsdkProvider` sets `devMode={{ actionDelayMs: 0 }}`, so writes land fast enough locally that the extra machinery would only obscure what the tutorial is teaching. Add it in a real application, where the server round-trip is not free.

### Action parameters

| Action type | Object reference parameter |
|---|---|
| Create | _(properties passed directly)_ |
| Modify | `objectToModifyParameter` |
| Delete | `objectToDeleteParameter` |
| CreateOrModify | `objectToCreateOrModifyParameter` |

## Gotchas

- **The OSDK export name comes from `apiName`, not the exported const.** `defineObject({ apiName: "task" })` assigned to `export const TutorialTask` still generates `export { task }`. App and function code imports `task`, and `Osdk.Instance<task>` is the only form that compiles. Actions kebab-to-camel their `apiName`, so `create-task-action` becomes `createTaskAction`.
- **`streamUpdates: true` does nothing against the local ontology.** The client opens a websocket to `api/v2/ontologySubscriptions/...`, which the local preview does not serve, so the platform API proxy answers `501 PlatformApiProxyPathNotAllowlisted`. The option is correct to keep for deployed use. Do not add polling to work around it locally.
- Object types need `editsEnabled: true` for any action to work on them.
- `defineCreateObjectAction` fails on a duplicate primary key with `Ontologies:ObjectAlreadyExists`. Use `defineCreateOrModifyObjectAction` for upsert behaviour, or generate keys.
- `@ontology/sdk` imports show TypeScript errors until codegen has run once. Run the dev server before trusting the editor.
- `ontology.mts` is authored with 4-space indentation. Match the file you are editing.

## References

See @ontology/README.md for the `@osdk/maker` API reference.
See @README.md for getting started, project layout and deployment.
