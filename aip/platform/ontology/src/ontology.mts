import { defineObject, defineCreateObjectAction, defineModifyObjectAction } from "@osdk/maker";
import type { ActionType, ObjectTypeDefinition } from "@osdk/maker";

export const Officer: ObjectTypeDefinition = defineObject({
    apiName: "TalentOfficer",
    displayName: "38G Officer",
    pluralDisplayName: "38G Officers",
    titlePropertyApiName: "name",
    primaryKeyPropertyApiName: "id",
    properties: {
        id: { type: "string", displayName: "Officer ID" },
        name: { type: "string" },
        ownerUserId: { type: "string", displayName: "Profile owner" },
        rank: { type: "string" },
        unit: { type: "string" },
        specialty: { type: "string" },
        civilianOccupation: { type: "string" },
        skills: { type: "string" },
        languages: { type: "string" },
        clearance: { type: "string" },
        narrative: { type: "string" },
        profileJson: { type: "string", displayName: "Full profile" },
        searchableText: { type: "string", displayName: "Searchable profile" },
    },
    editsEnabled: true,
    includeEmptyBackingDatasource: true,
});

export const createOfficer: ActionType = defineCreateObjectAction({
    objectType: Officer,
    apiName: "create-talent-officer",
    displayName: "Create officer profile",
    primaryKeyOption: "userInput",
    nonParameterMappings: { ownerUserId: { type: "currentUser" } },
    parameterConfiguration: { id: { required: true }, name: { required: true } },
});

export const modifyOfficer: ActionType = defineModifyObjectAction({
    objectType: Officer,
    apiName: "modify-talent-officer",
    displayName: "Update officer profile",
    excludedProperties: ["ownerUserId"],
    parameterConfiguration: { name: { required: true } },
    actionLevelValidation: [{
        condition: {
            type: "comparison",
            comparison: {
                operator: "EQUALS",
                left: { type: "objectParameterPropertyValue", objectParameterPropertyValue: { parameterId: "objectToModifyParameter", propertyTypeId: "ownerUserId" } },
                right: { type: "userProperty", userProperty: { userId: { type: "currentUser", currentUser: {} }, propertyValue: { type: "userId", userId: {} } } },
            },
        },
    }],
});

export const Settings: ObjectTypeDefinition = defineObject({
    apiName: "TalentSettings",
    displayName: "Talent Search Settings",
    pluralDisplayName: "Talent Search Settings",
    titlePropertyApiName: "id",
    primaryKeyPropertyApiName: "id",
    properties: {
        id: { type: "string" },
        model: { type: "string", displayName: "Destination AIP model" },
    },
    editsEnabled: true,
    includeEmptyBackingDatasource: true,
});

export const createSettings: ActionType = defineCreateObjectAction({
    objectType: Settings,
    apiName: "create-talent-settings",
    displayName: "Configure talent search model",
    primaryKeyOption: "userInput",
});
