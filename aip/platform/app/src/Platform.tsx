/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { TalentOfficer, TalentSettings, createTalentOfficer, modifyTalentOfficer } from '@ontology/sdk';
import { OsdkProvider, useRegisterUserAgent, useOsdkObjects, useOsdkObject, useOsdkAction } from '@osdk/react';
import * as User from '@osdk/foundry.admin/User';
import client from './client';
import type { BuilderProfile } from './lib/builder';
import { officerParameters, type OfficerRecord } from './lib/profile';

export const localPreview = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
type Identity = {id:string; givenName?:string; familyName?:string};
interface PlatformValue {
  identity:Identity;
  officers:OfficerRecord[];
  loading:boolean;
  error?:string;
  model:string;
  save:(profile:BuilderProfile,id?:string)=>Promise<string>;
}
const PlatformContext = createContext<PlatformValue | null>(null);

export function PlatformProvider({children}:{children:ReactNode}) {
  const [identity,setIdentity] = useState<Identity>();
  const [identityError,setIdentityError] = useState('');
  useEffect(()=>{
    let active=true;
    const verify=()=>User.getCurrent(client).then(user=>{if(active){setIdentity(user);setIdentityError('');}}).catch(()=>{if(active){setIdentity(undefined);setIdentityError('Unable to verify your AIP user. Sign in again to continue.');}});
    void verify();
    const onFocus=()=>{void verify();};
    window.addEventListener('focus',onFocus);
    return()=>{active=false;window.removeEventListener('focus',onFocus);};
  },[]);
  if (!identity) return <div className="p-8" role="status">{identityError || 'Signing in to AIP…'}</div>;
  // Account changes discard the previous user's drafts, documents, and conversations.
  return <OsdkProvider key={identity.id} client={client} devMode={{actionDelayMs:0}}><UserPlatform identity={identity}>{children}</UserPlatform></OsdkProvider>;
}

function UserPlatform({identity,children}:{identity:Identity;children:ReactNode}) {
  useRegisterUserAgent("38g-talent-search/faithful-port");
  const roster = useOsdkObjects(TalentOfficer,{pageSize:100,autoFetchMore:true});
  const {object:settings} = useOsdkObject(TalentSettings,'default');
  const [refreshError,setRefreshError] = useState<string>();
  const create = useOsdkAction(createTalentOfficer);
  const modify = useOsdkAction(modifyTalentOfficer);
  async function save(profile:BuilderProfile,id?:string) {
    if (localPreview) throw new Error('The local Foundry simulator cannot verify Action ownership. Saving requires the deployed AIP application. Your draft remains available to download as HTML.');
    // Re-check the authenticated subject at the mutation boundary as well as in the UI.
    const current = await User.getCurrent(client);
    if (current.id !== identity.id) throw new Error('Your signed-in account changed. Reload before saving.');
    const params = officerParameters(profile);
    if (id) {
      const officer = roster.data?.find(o=>o.$primaryKey===id);
      if (!officer || officer.ownerUserId !== identity.id) throw new Error('Only the owner can edit this profile.');
      // Foundry also enforces this condition in the Action; the browser is not the authority.
      await modify.applyAction({...params,objectToModifyParameter:officer});
    } else {
      id=crypto.randomUUID();
      await create.applyAction({...params,id});
    }
    // A confirmed save must not be reported as a failed create if only the refresh fails.
    void roster.refetch().then(()=>setRefreshError(undefined)).catch(()=>setRefreshError('Your profile was saved, but the roster could not refresh. Reload before searching.'));
    return id;
  }
  return <PlatformContext.Provider value={{identity,officers:(roster.data||[]).map(o=>({...o,id:o.$primaryKey})),loading:roster.isLoading||roster.hasMore,error:roster.error?.message||refreshError,model:settings?.model||'',save}}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const value=useContext(PlatformContext);
  if (!value) throw new Error('PlatformProvider is required.');
  return value;
}
