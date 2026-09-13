import { getFoundryToken, getOpenAiBaseUrl, createFetch } from '@osdk/language-models';
import client from '../client';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

import { sseData } from './sse';

export async function aipChat(model: string, messages: ChatMessage[], onText?: (text:string)=>void, signal?:AbortSignal, json=false): Promise<string> {
  if (!model) throw new Error('The destination AIP model has not been configured.');
  const response = await createFetch(client)(`${getOpenAiBaseUrl(client).replace(/\/$/,'')}/chat/completions`, {
    method:'POST',
    headers:{Authorization:`Bearer ${await getFoundryToken(client)}`,'Content-Type':'application/json'},
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(180000),
    body:JSON.stringify({model,messages,stream:!!onText,max_completion_tokens:12000,...(json?{response_format:{type:'json_object'}}:{})}),
  });
  if (!response.ok) throw new Error(`AIP request failed (${response.status}). Check model access and application permissions.`);
  if (!onText) {
    const result = await response.json();
    if (result.choices?.[0]?.finish_reason !== 'stop') throw new Error('AIP did not finish its response. Your current card and results are preserved.');
    return result.choices[0].message.content || '';
  }
  if (!response.body) throw new Error('AIP did not return a response stream.');
  let text = ''; let complete = false;
  for await (const data of sseData(response.body)) {
    if (data === '[DONE]') break;
    const event = JSON.parse(data);
    if (event.error) throw new Error('AIP reported an error while streaming. Please retry.');
    const choice = event.choices?.[0];
    if (choice?.delta?.content) { text += choice.delta.content; onText(text); }
    if (choice?.finish_reason) {
      if (choice.finish_reason !== 'stop') throw new Error('AIP stopped before completing its response. Please retry.');
      complete = true;
    }
  }
  if (!complete) throw new Error('The AIP connection ended before completion. Please retry.');
  return text;
}
