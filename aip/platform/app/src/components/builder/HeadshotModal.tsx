import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

// Original photo selection is retained. No generation, enhancement, cropping, or resizing.
export function HeadshotModal({isOpen,onClose,onComplete,currentHeadshot}:{isOpen:boolean;onClose:()=>void;onComplete:(image:string)=>void;currentHeadshot:string|null}) {
  const [preview,setPreview]=useState<string|null>(null);
  const [error,setError]=useState('');
  return <Dialog open={isOpen} onOpenChange={open=>{if(!open){setPreview(null);setError('');onClose();}}}>
    <DialogContent>
      <DialogHeader><DialogTitle>Headshot Photo</DialogTitle><DialogDescription>Upload an original photo for your baseball card.</DialogDescription></DialogHeader>
      <input aria-label="Upload headshot" type="file" accept="image/jpeg,image/png,image/webp" onChange={async event=>{
        const file=event.target.files?.[0]; if(!file)return;
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPEG, PNG, or WebP photo.');return;}
        const reader=new FileReader();reader.onload=()=>{setPreview(String(reader.result));setError('');};reader.onerror=()=>setError('The photo could not be read.');reader.readAsDataURL(file);
      }}/>
      {(preview||currentHeadshot)&&<img className="max-h-80 mx-auto object-contain" src={preview||currentHeadshot||''} alt="Headshot preview"/>}
      {error&&<p role="alert">{error}</p>}
      <div className="flex gap-2"><Button disabled={!preview&&!currentHeadshot} onClick={()=>{onComplete(preview||currentHeadshot||'');setPreview(null);onClose();}}>Use Original Photo</Button><Button variant="outline" onClick={()=>{setPreview(null);onClose();}}>Cancel</Button></div>
    </DialogContent>
  </Dialog>;
}
