import type { ActionDefinition, ActionParam, ActionReturnTypeForOptions, ApplyActionOptions, ApplyBatchActionOptions } from '@osdk/client';
import { $osdkMetadata } from '../../OntologyMetadata.js';
export declare namespace createTalentSettings {
    type ParamsDefinition = {
        id: {
            displayName: 'Id';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
        model: {
            displayName: 'Destination AIP model';
            multiplicity: false;
            nullable: true;
            type: 'string';
        };
    };
    interface Params {
        readonly id?: ActionParam.PrimitiveType<'string'> | null;
        readonly model?: ActionParam.PrimitiveType<'string'> | null;
    }
    interface Signatures {
        applyAction<OP extends ApplyActionOptions>(args: createTalentSettings.Params, options?: OP): Promise<ActionReturnTypeForOptions<OP>>;
        batchApplyAction<OP extends ApplyBatchActionOptions>(args: ReadonlyArray<createTalentSettings.Params>, options?: OP): Promise<ActionReturnTypeForOptions<OP>>;
    }
}
/**
 *
 *
 * **Note on null values:** _For optional parameters, explicitly providing a null value instead of undefined
 * can change the behavior of the applied action. If prefills are configured, null prevents them
 * from being applied. If a parameter modifies an object's property, null will clear the data from
 * the object, whereas undefined would not modify that property._
 * @param {ActionParam.PrimitiveType<"string">} [id]
 * @param {ActionParam.PrimitiveType<"string">} [model]
 */
export interface createTalentSettings extends ActionDefinition<createTalentSettings.Signatures> {
    __DefinitionMetadata?: {
        apiName: 'com.kinetiqs.talent.createTalentSettings';
        description: '';
        displayName: 'Configure talent search model';
        modifiedEntities: {
            'com.kinetiqs.talent.TalentSettings': {
                created: true;
                modified: false;
            };
        };
        parameters: createTalentSettings.ParamsDefinition;
        rid: 'ri.ontology-metadata.temp.action-type.b19029e4b06e2acf4e8268caefc9960ca1ba2901d4bffb750929bb900f3140ce';
        status: 'ACTIVE';
        type: 'action';
        unsanitizedApiName: 'com.kinetiqs.talent.create-talent-settings';
        signatures: createTalentSettings.Signatures;
    };
    apiName: 'com.kinetiqs.talent.createTalentSettings';
    type: 'action';
    unsanitizedApiName: 'com.kinetiqs.talent.create-talent-settings';
    osdkMetadata: typeof $osdkMetadata;
}
export declare const createTalentSettings: createTalentSettings;
//# sourceMappingURL=createTalentSettings.d.ts.map