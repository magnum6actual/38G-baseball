# Destination ontology contract

## TalentOfficer

Use object API name `TalentOfficer`, primary key `id`, title `name`, and enable object edits. All properties are strings:

`id`, `name`, `ownerUserId`, `rank`, `unit`, `specialty`, `civilianOccupation`, `skills`, `languages`, `clearance`, `narrative`, `profileJson`, `searchableText`.

`profileJson` is the complete original BuilderProfile structure, not a subset of display fields. The structured languages/deployments/experience/training/exercises, separate MOS code, dates, credentials, awards, and supplemental details must remain intact. `specialty` is plain-English specialty; it must never replace the distinct `mos_skill` in JSON. Preserve photo_original and photo_processed in profileJson as MIME-tagged base64 image data; legacy binary photos must be migrated as well as text. The adapter in app/src/lib/profile.ts performs lossless save mapping for these fields and excludes image bytes from searchable text.

Action API name `create-talent-officer` (SDK export `createTalentOfficer`): accept id, name and profile content. Require id and name. Set `ownerUserId` using a non-parameter current-user mapping in Foundry. Do NOT accept an owner parameter or trust a value inside profile JSON.

Action API name `modify-talent-officer` (SDK export `modifyTalentOfficer`): object parameter `objectToModifyParameter`, editable content properties, name required. Exclude ownerUserId. Add server-side validation:

`objectToModifyParameter.ownerUserId == currentUser.userId`

Never grant users a second Action or direct write path that bypasses this check. The browser also checks ownership, but Foundry's Action is the enforcement boundary. Unowned migrated objects remain uneditable by ordinary users until an administrator maps ownership explicitly. Do not infer owners from matching names or email text.

## TalentSettings

Use object API name `TalentSettings`, primary key/title `id`, string properties `id` and `model`. Create an object with id `default` and the destination model identifier. The optional `create-talent-settings` Action is administrative: grant it only to the application's administrators. Ordinary users need read access to this object, not settings write access.

## Permissions and identity

Grant roster read access according to the intended application's audience and destination markings. Editing is per owner; shared roster discovery remains the original application's purpose. Keep private interview messages and uploaded documents in the current browser session only; they are sent to the destination AIP model but not published as separate shared objects. Publishing a card writes the extracted profile through the owner-enforcing Action.

The exact definition is in `ontology.mts`. Verify the mapping and validation in the destination UI/generated metadata after creation, then test using two real users. Do not replace server enforcement with UI filtering.
