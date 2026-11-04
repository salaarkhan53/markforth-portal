'use client';
import {useRef} from 'react';
import type {ReactNode} from 'react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';

/* Accessible dialog: Esc closes it, focus stays inside while open and returns to
   whatever opened it. The last content is kept so it can fade out smoothly. */
export function SimpleDialog({open,onClose,title,className='',children}:{open:boolean;onClose:()=>void;title:string;className?:string;children:ReactNode}){
  const opener=useRef<HTMLElement|null>(null),wasOpen=useRef(false),last=useRef<ReactNode>(null);
  if(open&&!wasOpen.current&&typeof document!=='undefined'){const a=document.activeElement as HTMLElement|null;opener.current=a&&a!==document.body?a:null;}
  wasOpen.current=open;if(open)last.current=children;
  return <Dialog open={open} onOpenChange={o=>{if(!o)onClose();}}>
    <DialogContent className={'mf-dialog '+className} aria-describedby={undefined}
      onCloseAutoFocus={e=>{e.preventDefault();const t=opener.current;if(t&&t.isConnected)t.focus();}}>
      <DialogTitle className="visually-hidden">{title}</DialogTitle>
      {last.current}
    </DialogContent>
  </Dialog>;
}
