import type { PropertyDef as $PropertyDef } from '@osdk/client';
import { $osdkMetadata } from '../../OntologyMetadata.js';
import type { ObjectTypeDefinition as $ObjectTypeDefinition } from '@osdk/client';
import type { ObjectSet as $ObjectSet, Osdk as $Osdk, PropertyValueWireToClient as $PropType } from '@osdk/client';
export declare namespace TalentSettings {
    type PropertyKeys = 'id' | 'model';
    type Links = {};
    interface Props {
        /**
         *   property status: active
         *
         *   display name: 'Id'
         */
        readonly id: $PropType['string'];
        /**
         *   property status: active
         *
         *   display name: 'Destination AIP model'
         */
        readonly model: $PropType['string'] | undefined;
    }
    type StrictProps = Props;
    interface ObjectSet extends $ObjectSet<TalentSettings, TalentSettings.ObjectSet> {
    }
    type OsdkInstance<OPTIONS extends never | '$rid' = never, K extends keyof TalentSettings.Props = keyof TalentSettings.Props> = $Osdk.Instance<TalentSettings, OPTIONS, K>;
    /** @deprecated use OsdkInstance */
    type OsdkObject<OPTIONS extends never | '$rid' = never, K extends keyof TalentSettings.Props = keyof TalentSettings.Props> = OsdkInstance<OPTIONS, K>;
}
export interface TalentSettings extends $ObjectTypeDefinition {
    osdkMetadata: typeof $osdkMetadata;
    type: 'object';
    apiName: 'com.kinetiqs.talent.TalentSettings';
    primaryKeyApiName: 'id';
    primaryKeyType: 'string';
    __DefinitionMetadata?: {
        objectSet: TalentSettings.ObjectSet;
        props: TalentSettings.Props;
        linksType: TalentSettings.Links;
        strictProps: TalentSettings.StrictProps;
        apiName: 'com.kinetiqs.talent.TalentSettings';
        description: undefined;
        displayName: 'Talent Search Settings';
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
             *   display name: 'Id'
             */
            id: $PropertyDef<'string', 'non-nullable', 'single'>;
            /**
             *   property status: active
             *
             *   display name: 'Destination AIP model'
             */
            model: $PropertyDef<'string', 'nullable', 'single'>;
        };
        rid: 'ri.ontology.main.object-type.ce39c634-16d0-5bf1-a710-317f2ec1b2c1';
        status: 'ACTIVE';
        titleProperty: 'id';
        type: 'object';
        visibility: undefined;
    };
}
export declare const TalentSettings: TalentSettings;
//# sourceMappingURL=TalentSettings.d.ts.map