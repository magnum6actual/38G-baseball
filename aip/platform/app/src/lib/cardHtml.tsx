import { renderToStaticMarkup } from 'react-dom/server';
import { BaseballCard } from '../components/builder/BaseballCard';
import type { BuilderProfile } from './builder';
import { photoFromProfile } from './profile';
import cardStyles from './print-card.css?inline';

export function cardHtml(profile:BuilderProfile):string {
  const markup=renderToStaticMarkup(<BaseballCard profile={profile} headshotPreview={photoFromProfile(profile)} onProfileUpdate={()=>{}} onHeadshotClick={()=>{}} />);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>38G Baseball Card</title><style>${cardStyles}</style></head><body>${markup}</body></html>`;
}
export function downloadCard(profile:BuilderProfile) {
  const url=URL.createObjectURL(new Blob([cardHtml(profile)],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='38G_Baseball_Card.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function printCard(profile:BuilderProfile) {
  const frame=document.createElement('iframe');
  frame.title='Printable 38G Baseball Card';frame.style.cssText='position:fixed;width:0;height:0;border:0';
  frame.srcdoc=cardHtml(profile);
  frame.onload=async()=>{await frame.contentDocument?.fonts.ready;frame.contentWindow?.focus();frame.contentWindow?.print();};
  document.body.append(frame);
  setTimeout(()=>frame.remove(),60000);
}
