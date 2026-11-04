'use client';
import {useEffect,useRef,useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {IDLE_TIMEOUT_MS} from '@/lib/session-config';
import {Sparkles,FilePlus,ListChecks,MessageSquare,LogOut,X,ArrowRight,ArrowLeft} from 'lucide-react';

/* First-login tour for agents. Not shown to admins.
   Remembered per user in this browser; the key uses a hash, not the email itself. */
export const TOUR_EVENT='markforth-start-tour';
function keyFor(email:string){let h=0x811c9dc5;for(const c of email.toLowerCase()){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}return 'mf-tour-v1:'+h.toString(16);}

type Step={icon:LucideIcon;title:string;body:string;target?:string[]};
const STEPS=(first:string):Step[]=>[
  {icon:Sparkles,title:`Welcome to Markforth, ${first}`,body:'This is your workspace for submitting leads, following their results and keeping up with your team. This quick tour takes under a minute.'},
  {icon:FilePlus,title:'Submit a lead',body:'After a transfer, open Submit a lead, pick the DID the call came in on and fill in the customer’s details. The form tells you if anything needs fixing.',target:['Submit a lead']},
  {icon:ListChecks,title:'Follow your results',body:'Lead pipeline shows every lead you’ve submitted. An administrator marks each one Sale, Not a sale or Pending, and any review note, like a rejection reason, shows right there.',target:['Lead pipeline']},
  {icon:MessageSquare,title:'Stay in the loop',body:'Team chat is for updates and wins. Power hour shows live bonus challenges, and a banner appears at the top of every page when one is running.',target:['Team chat','Power hour']},
  {icon:LogOut,title:'Logging out',body:`Use Log out at the bottom of the menu when you’re done. For your security, you’re also logged out after ${Math.round(IDLE_TIMEOUT_MS/60000)} minutes without activity. You’ll get a warning just before it happens.`,target:['__logout']},
];

function highlight(names:string[]|undefined){
  document.querySelectorAll('.tour-highlight').forEach(el=>el.classList.remove('tour-highlight'));
  if(!names)return;
  const desktop=getComputedStyle(document.querySelector('.mf-shell>.mf-sidebar')||document.body).display!=='none';
  if(!desktop){document.querySelector('.mf-menu-btn')?.classList.add('tour-highlight');return;}
  for(const name of names){
    const el=name==='__logout'?document.querySelector('.mf-shell>.mf-sidebar .mf-logout'):[...document.querySelectorAll('.mf-shell>.mf-sidebar .mf-nav-item')].find(b=>b.querySelector('span')?.textContent===name);
    el?.classList.add('tour-highlight');
  }
}

export function WelcomeTour({name,email}:{name:string;email:string}){
  const [open,setOpen]=useState(false),[step,setStep]=useState(0);
  const titleRef=useRef<HTMLHeadingElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const steps=STEPS(name.split(' ')[0]||name),current=steps[step],Icon=current.icon,last=step===steps.length-1;

  useEffect(()=>{let seen=true;try{seen=!!localStorage.getItem(keyFor(email));}catch{}if(!seen){const t=setTimeout(()=>start(),600);return()=>clearTimeout(t);}},[email]);
  useEffect(()=>{const replay=()=>start();window.addEventListener(TOUR_EVENT,replay);return()=>window.removeEventListener(TOUR_EVENT,replay);},[]);
  useEffect(()=>{if(!open)return;highlight(current.target);titleRef.current?.focus({preventScroll:true});},[open,step]);
  useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();finish();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[open]);
  useEffect(()=>()=>highlight(undefined),[]);

  function start(){returnFocus.current=document.activeElement as HTMLElement|null;setStep(0);setOpen(true);}
  function finish(){try{localStorage.setItem(keyFor(email),String(Date.now()));}catch{}setOpen(false);highlight(undefined);const t=returnFocus.current;if(t&&t.isConnected&&t!==document.body)t.focus();else document.getElementById('page-title')?.focus({preventScroll:true});}

  if(!open)return null;
  return <section className="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body">
    <button type="button" className="tour-close" onClick={finish} aria-label="Skip the tour"><X size={18} aria-hidden="true"/></button>
    <div className="tour-icon"><Icon size={22} aria-hidden="true"/></div>
    <p className="tour-count">Step {step+1} of {steps.length}</p>
    <h2 id="tour-title" ref={titleRef} tabIndex={-1}>{current.title}</h2>
    <p id="tour-body">{current.body}</p>
    <div className="tour-dots" aria-hidden="true">{steps.map((_,i)=><i key={i} className={i===step?'is-on':''}/>)}</div>
    <div className="tour-actions">
      {step===0?<button type="button" className="text-btn" onClick={finish}>Skip tour</button>:<button type="button" className="secondary btn-sm" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={15} aria-hidden="true"/>Back</button>}
      <button type="button" className="primary btn-sm" onClick={()=>last?finish():setStep(s=>s+1)}>{last?'Got it':step===0?'Show me around':'Next'}{!last&&<ArrowRight size={15} aria-hidden="true"/>}</button>
    </div>
  </section>;
}
