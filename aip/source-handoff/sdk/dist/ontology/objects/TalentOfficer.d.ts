import type { PropertyDef as $PropertyDef } from '@osdk/client';
import { $osdkMetadata } from '../../OntologyMetadata.js';
import type { ObjectTypeDefinition as $ObjectTypeDefinition } from '@osdk/client';
import type { ObjectSet as $ObjectSet, Osdk as $Osdk, PropertyValueWireToClient as $PropType } from '@osdk/client';
export declare namespace TalentOfficer {
    type PropertyKeys = 'civilianOccupation' | 'clearance' | 'id' | 'languages' | 'name' | 'narrative' | 'ownerUserId' | 'profileJson' | 'rank' | 'searchableText' | 'skills' | 'specialty' | 'unit';
    type Links = {};
    interface Props {
        /**
         *   property status: active
         *
         *   display name: 'CivilianOccupation'
         */
        readonly civilianOccupation: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Clearance'
         */
        readonly clearance: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Officer ID'
         */
        readonly id: $PropType['string'];
        /**
         *   property status: active
         *
         *   display name: 'Languages'
         */
        readonly languages: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Name'
         */
        readonly name: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Narrative'
         */
        readonly narrative: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Profile owner'
         */
        readonly ownerUserId: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Full profile'
         */
        readonly profileJson: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Rank'
         */
        readonly rank: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Searchable profile'
         */
        readonly searchableText: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Skills'
         */
        readonly skills: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Specialty'
         */
        readonly specialty: $PropType['string'] | undefined;
        /**
         *   property status: active
         *
         *   display name: 'Unit'
         */
        readonly unit: $PropType['string'] | undefined;
    }
    type StrictProps = Props;
    interface ObjectSet extends $ObjectSet<TalentOfficer, TalentOfficer.ObjectSet> {
    }
    type OsdkInstance<OPTIONS extends never | '$rid' = never, K extends keyof TalentOfficer.Props = keyof TalentOfficer.Props> = $Osdk.Instance<TalentOfficer, OPTIONS, K>;
    /** @deprecated use OsdkInstance */
    type OsdkObject<OPTIONS extends never | '$rid' = never, K extends keyof TalentOfficer.Props = keyof TalentOfficer.Props> = OsdkInstance<OPTIONS, K>;
}
export interface TalentOfficer extends $ObjectTypeDefinition {
    osdkMetadata: typeof $osdkMetadata;
    type: 'object';
    apiName: 'com.kinetiqs.talent.TalentOfficer';
    primaryKeyApiName: 'id';
    primaryKeyType: 'string';
    __DefinitionMetadata?: {
        objectSet: TalentOfficer.ObjectSet;
        props: TalentOfficer.Props;
        linksType: TalentOfficer.Links;
        strictProps: TalentOfficer.StrictProps;
        apiName: 'com.kinetiqs.talent.TalentOfficer';
        description: undefined;
        displayName: '38G Officer';
        icon: {
            type: 'blueprint';
            color: '#2D72D2';
            name: 'cube';
        };
        implements: [];
        interfaceMap: {};
        inverseInterfaceMap: {};
        links: {};
        pluralDisplayName: '';
        primaryKeyApiName: 'id';
        primaryKeyType: 'string';
        properties: {
            /**
             *   property status: active
             *
             *   display name: 'CivilianOccupation'
             */
            civilianOccupation: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Clearance'
             */
            clearance: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Officer ID'
             */
            id: $PropertyDef<'string', 'non-nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Languages'
             */
            languages: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Name'
             */
            name: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Narrative'
             */
            narrative: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Profile owner'
             */
            ownerUserId: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Full profile'
             */
            profileJson: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Rank'
             */
            rank: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Searchable profile'
             */
            searchableText: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Skills'
             */
            skills: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Specialty'
             */
            specialty: $PropertyDef<'string', 'nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Unit'
             */
            unit: $PropertyDef<'string', 'nullable', 'single'>;
        };
        rid: 'ri.ontology.main.object-type.f6b5bdc0-d4fe-560d-88b7-9b1f58606734';
        status: 'ACTIVE';
        titleProperty: 'name';
        type: 'object';
        visibility: undefined;
    };
}
export declare const TalentOfficer: TalentOfficer;
//# sourceMappingURL=TalentOfficer.d.ts.map