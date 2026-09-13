import type { ActionDefinition, ActionMetadata, ActionParam, ActionReturnTypeForOptions, ApplyActionOptions, ApplyBatchActionOptions } from '@osdk/client';
import { $osdkMetadata } from '../../OntologyMetadata.js';
import type { TalentOfficer } from '../objects/TalentOfficer.js';
export declare namespace modifyTalentOfficer {
    type ParamsDefinition = {
        civilianOccupation: {
            displayName: 'CivilianOccupation';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        clearance: {
            displayName: 'Clearance';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        languages: {
            displayName: 'Languages';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        name: {
            displayName: 'Name';
            multiplicity: false;
            nullable: false;
            type: 'string';
        };
        narrative: {
            displayName: 'Narrative';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        objectToModifyParameter: {
            displayName: 'Modify object';
            multiplicity: false;
            nullable: false;
            type: ActionMetadata.DataType.Object<TalentOfficer>;
        };
        profileJson: {
            displayName: 'Full profile';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        rank: {
            displayName: 'Rank';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        searchableText: {
            displayName: 'Searchable profile';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        skills: {
            displayName: 'Skills';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        specialty: {
            displayName: 'Specialty';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        unit: {
            displayName: 'Unit';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
    };
    interface Params {
        readonly civilianOccupation?: ActionParam.PrimitiveType<'string'> | null;
        readonly clearance?: ActionParam.PrimitiveType<'string'> | null;
        readonly languages?: ActionParam.PrimitiveType<'string'> | null;
        readonly name: ActionParam.PrimitiveType<'string'>;
        readonly narrative?: ActionParam.PrimitiveType<'string'> | null;
        readonly objectToModifyParameter: ActionParam.ObjectType<TalentOfficer>;
        readonly profileJson?: ActionParam.PrimitiveType<'string'> | null;
        readonly rank?: ActionParam.PrimitiveType<'string'> | null;
        readonly searchableText?: ActionParam.PrimitiveType<'string'> | null;
        readonly skills?: ActionParam.PrimitiveType<'string'> | null;
        readonly specialty?: ActionParam.PrimitiveType<'string'> | null;
        readonly unit?: ActionParam.PrimitiveType<'string'> | null;
    }
    interface Signatures {
        applyAction<OP extends ApplyActionOptions>(args: modifyTalentOfficer.Params, options?: OP): Promise<ActionReturnTypeForOptions<OP>>;
        batchApplyAction<OP extends ApplyBatchActionOptions>(args: ReadonlyArray<modifyTalentOfficer.Params>, options?: OP): Promise<ActionReturnTypeForOptions<OP>>;
    }
}
/**
 *
 *
 * **Note on null values:** _For optional parameters, explicitly providing a null value instead of undefined
 * can change the behavior of the applied action. If prefills are configured, null prevents them
 * from being applied. If a parameter modifies an object's property, null will clear the data from
 * the object, whereas undefined would not modify that property._
 * @param {ActionParam.PrimitiveType<"string">} [civilianOccupation]
 * @param {ActionParam.PrimitiveType<"string">} [clearance]
 * @param {ActionParam.PrimitiveType<"string">} [languages]
 * @param {ActionParam.PrimitiveType<"string">} name
 * @param {ActionParam.PrimitiveType<"string">} [narrative]
 * @param {ActionParam.ObjectType<TalentOfficer>} objectToModifyParameter
 * @param {ActionParam.PrimitiveType<"string">} [profileJson]
 * @param {ActionParam.PrimitiveType<"string">} [rank]
 * @param {ActionParam.PrimitiveType<"string">} [searchableText]
 * @param {ActionParam.PrimitiveType<"string">} [skills]
 * @param {ActionParam.PrimitiveType<"string">} [specialty]
 * @param {ActionParam.PrimitiveType<"string">} [unit]
 */
export interface modifyTalentOfficer extends ActionDefinition<modifyTalentOfficer.Signatures> {
    __DefinitionMetadata?: {
        apiName: 'com.kinetiqs.talent.modifyTalentOfficer';
        description: '';
        displayName: 'Update officer profile';
        modifiedEntities: {
            'com.kinetiqs.talent.TalentOfficer': {
                created: false;
                modified: true;
            };
        };
        parameters: modifyTalentOfficer.ParamsDefinition;
        rid: 'ri.ontology-metadata.temp.action-type.ff23027a5b6fa19d7aeca932b21802f73e685158ee7a23e745c18724fe109593';
        status: 'ACTIVE';
        type: 'action';
        unsanitizedApiName: 'com.kinetiqs.talent.modify-talent-officer';
        signatures: modifyTalentOfficer.Signatures;
    };
    apiName: 'com.kinetiqs.talent.modifyTalentOfficer';
    type: 'action';
    unsanitizedApiName: 'com.kinetiqs.talent.modify-talent-officer';
    osdkMetadata: typeof $osdkMetadata;
}
export declare const modifyTalentOfficer: modifyTalentOfficer;
//# sourceMappingURL=modifyTalentOfficer.d.ts.map