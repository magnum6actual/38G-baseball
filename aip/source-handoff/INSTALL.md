# Install from source without Marketplace

## 1. Bring the source into the destination

Transfer the ZIP through the user's available channel, including SAFE if needed. Extract it into a destination Code Workspace or approved development workstation. Keep the complete folder structure. The outer source ZIP is not a website asset ZIP and is not a Marketplace import.

Create/select the destination project and a client-facing Developer Console application. Use user permissions and authorization-code OAuth; do not select a backend service or embed a client secret. AIP Assist can help explain the code and setup; execution depends on the tools and permissions available to the destination agent.

## 2. Establish ontology resources and Actions

Follow `ontology/CONTRACT.md`. Use `ontology/ontology.mts` as the exact schema and action-rule reference. If the enrollment supports ontology-as-code, its own tooling can apply this definition. Otherwise create equivalent resources in Ontology Manager. Merely importing the TypeScript file does not create the ontology.

Select these resources for the Developer Console app. If the exact API names already belong to another application, do not overwrite that application; use a destination namespace, regenerate the SDK, and update the imports/adapter mappings to match.

Use the supplied generated SDK only with the matching schema. Its generator metadata includes a placeholder ontology RID; the app constructs its client with `VITE_FOUNDRY_ONTOLOGY_RID`, not that exported placeholder. If you regenerate the SDK, install it under the `@ontology/sdk` dependency alias or update imports consistently.

## 3. Configure identity, AIP, and website access

Grant application access to ontology reads, its create/modify Actions, the current-user operation, and the AIP chat-completions operation. Respect the same user's resource permissions. The client requests:

- `api:use-ontologies-read`
- `api:use-ontologies-write`
- `api:admin-read` (for current-user identity)
- `api:use-language-models-execute`

The application uses `GET /api/v2/admin/users/getCurrent` and `POST /api/v2/llm/proxy/openai/v1/chat/completions`. Confirm those operations and the selected model are enabled on the destination. No OpenAI/Anthropic/Azure API key is required; the requests use Foundry OAuth and its AIP proxy.

Create the settings object with primary key `default` and its `model` property set to the destination's model identifier. Choose a model supporting streaming chat, `response_format: json_object`, and `max_completion_tokens`. The originating enrollment's model choice is not hardcoded in the source.

In Developer Console, choose Website hosting and request a destination application subdomain. Obtain the domain approval required by that enrollment. Register the exact HTTPS callback URL, `https://<approved-app-host>/auth/callback`, in the OAuth application. Set the same URL in the environment.

## 4. Build

Use Node.js 22.18 or later and npm. From the package's `app` directory:

```sh
npm ci
cp .env.example .env.production
```

Edit `.env.production` with the destination values. All values are public application configuration, not secrets. Never enable `VITE_USE_MOCK_AUTH` in an installation. This portable package uses a plain Vite configuration and does not depend on the local Foundry simulator, SuperRepo, Nx, signing keys, or Marketplace.

Then run:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The output is `app/dist`. Dependencies come from the registry allowed on that workstation/enrollment. If public npm is unavailable, configure the enrollment's approved mirror before installation; do not place registry credentials in the package. A different mirror may require generating a destination lockfile according to that enrollment's dependency policy.

## 5. Publish directly through Developer Console

Create a separate ZIP containing the **contents** of `app/dist`, with `index.html` at the ZIP root. In Developer Console → Website hosting, upload the compressed static assets and deploy the selected version. The application's two routes and OAuth callback rely on single-page-app fallback; do not add a custom 404 page that prevents that fallback.

Open the hosted URL and complete the acceptance checks below. A successful asset upload alone is not evidence that ontology access, AIP calls, or owner enforcement work.

## 6. Data migration and acceptance

Start with synthetic test profiles only; optional demo-data/talent-officers.json contains the original 20 fictional profiles with their existing headshots. Map complete original profile records into `profileJson` and populate the searchable fields using `app/src/lib/profile.ts`. Keep MOS code distinct from plain-English specialty, all structured arrays, expiration dates, and supplemental detail. Preserve existing photos: map legacy photo_original_blob to profileJson.photo_original and photo_blob to profileJson.photo_processed as data:image/jpeg;base64,..., data:image/png;base64,..., or data:image/webp;base64,... using the actual image MIME type. Do not strip photos while building JSON, and do not add them to searchableText or model prompts. The app displays the original photo when present, otherwise the existing processed photo, without generating or manipulating images. Do not import the old shared conversations as anybody's private history. Assign owners only from an explicit, approved mapping to destination Foundry user IDs.

Run the two-user and workflow checks in VERIFICATION.md. If ownership is not correctly enforced, do not treat the app as ready for profile editing.

## Official references

- [Host an OSDK application on Foundry](https://www.palantir.com/docs/foundry/developer-console/deploy-custom-application-on-foundry)
- [Developer Console permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)
- [AIP features in Code Repositories](https://www.palantir.com/docs/foundry/code-repositories/aip-features)

These document the direct hosting path; destination availability and privileges still need to be checked.
