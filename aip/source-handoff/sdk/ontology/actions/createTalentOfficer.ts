import type {
  ActionDefinition,
  ActionMetadata,
  ActionParam,
  ActionReturnTypeForOptions,
  ApplyActionOptions,
  ApplyBatchActionOptions,
} from '@osdk/client';
import { $osdkMetadata } from '../../OntologyMetadata.js';

export namespace createTalentOfficer {
  // Represents the definition of the parameters for the action
  export type ParamsDefinition = {
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
    id: {
      displayName: 'Officer ID';
      multiplicity: false;
      nullable: false;
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

  export interface Params {
    readonly civilianOccupation?: ActionParam.PrimitiveType<'string'> | null;

    readonly clearance?: ActionParam.PrimitiveType<'string'> | null;

    readonly id: ActionParam.PrimitiveType<'string'>;

    readonly languages?: ActionParam.PrimitiveType<'string'> | null;

    readonly name: ActionParam.PrimitiveType<'string'>;

    readonly narrative?: ActionParam.PrimitiveType<'string'> | null;

    readonly profileJson?: ActionParam.PrimitiveType<'string'> | null;

    readonly rank?: ActionParam.PrimitiveType<'string'> | null;

    readonly searchableText?: ActionParam.PrimitiveType<'string'> | null;

    readonly skills?: ActionParam.PrimitiveType<'string'> | null;

    readonly specialty?: ActionParam.PrimitiveType<'string'> | null;

    readonly unit?: ActionParam.PrimitiveType<'string'> | null;
  }

  // Represents a fqn of the action
  export interface Signatures {
    applyAction<OP extends ApplyActionOptions>(
      args: createTalentOfficer.Params,
      options?: OP,
    ): Promise<ActionReturnTypeForOptions<OP>>;

    batchApplyAction<OP extends ApplyBatchActionOptions>(
      args: ReadonlyArray<createTalentOfficer.Params>,
      options?: OP,
    ): Promise<ActionReturnTypeForOptions<OP>>;
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
 * @param {ActionParam.PrimitiveType<"string">} id
 * @param {ActionParam.PrimitiveType<"string">} [languages]
 * @param {ActionParam.PrimitiveType<"string">} name
 * @param {ActionParam.PrimitiveType<"string">} [narrative]
 * @param {ActionParam.PrimitiveType<"string">} [profileJson]
 * @param {ActionParam.PrimitiveType<"string">} [rank]
 * @param {ActionParam.PrimitiveType<"string">} [searchableText]
 * @param {ActionParam.PrimitiveType<"string">} [skills]
 * @param {ActionParam.PrimitiveType<"string">} [specialty]
 * @param {ActionParam.PrimitiveType<"string">} [unit]
 */
export interface createTalentOfficer extends ActionDefinition<createTalentOfficer.Signatures> {
  __DefinitionMetadata?: {
    apiName: 'com.kinetiqs.talent.createTalentOfficer';
    description: '';
    displayName: 'Create officer profile';
    modifiedEntities: {
      'com.kinetiqs.talent.TalentOfficer': {
        created: true;
        modified: false;
      };
    };
    parameters: createTalentOfficer.ParamsDefinition;
    rid: 'ri.ontology-metadata.temp.action-type.de9f1cf9b886831b553560c926021c0e83cdba959059b7c669214b3c78a05808';
    status: 'ACTIVE';
    type: 'action';
    unsanitizedApiName: 'com.kinetiqs.talent.create-talent-officer';

    signatures: createTalentOfficer.Signatures;
  };
  apiName: 'com.kinetiqs.talent.createTalentOfficer';
  type: 'action';
  unsanitizedApiName: 'com.kinetiqs.talent.create-talent-officer';
  osdkMetadata: typeof $osdkMetadata;
}

export const createTalentOfficer: createTalentOfficer = {
  apiName: 'com.kinetiqs.talent.createTalentOfficer',
  type: 'action',
  unsanitizedApiName: 'com.kinetiqs.talent.create-talent-officer',
  osdkMetadata: $osdkMetadata,
};
