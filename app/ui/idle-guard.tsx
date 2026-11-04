'use client';
import {useEffect,useRef,useState} from 'react';
import {Clock3,LogOut} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {IDLE_TIMEOUT_MS,IDLE_WARNING_MS,HEARTBEAT_INTERVAL_MS} from '@/lib/session-config';

/* Signs the user out after IDLE_TIMEOUT_MS without real activity.
   - Activity = pointer, clicks, keys, scroll, touch. Background polling never counts.
   - Times are compared as timestamps, so sleep and hidden tabs are handled when the page wakes.
   - All tabs share activity and logout through BroadcastChannel (with a localStorage fallback).
   - The server enforces the same limit; heartbeats tell it about real activity. */
const STORE_ACTIVITY='mf-last-activity',STORE_LOGOUT='mf-logout';
/** Tell every other open tab that this user logged out. */
export function broadcastLogout(reason:'idle'|'logout'){try{const c=new BroadcastChannel('markforth-session');c.postMessage({type:'logout',reason,from:TAB_ID});c.close();}catch{}try{localStorage.setItem(STORE_LOGOUT,reason+':'+Date.now());}catch{}}
const TAB_ID=Math.random().toString(36).slice(2);
const ACTIVITY_EVENTS=['pointermove','pointerdown','keydown','wheel','touchstart','scroll'] as const;

export function IdleGuard({authSource}:{authSource:string}){
  const [warning,setWarning]=useState(false),[secondsLeft,setSecondsLeft]=useState(Math.round(IDLE_WARNING_MS/1000));
  const lastActivity=useRef(0),lastBeat=useRef(0),pendingBeat=useRef(false),ending=useRef(false),warningRef=useRef(false),channel=useRef<BroadcastChannel|null>(null),stayRef=useRef<HTMLButtonElement>(null);

  function destination(reason:'idle'|'logout'){
    const login='/login?reason='+reason;
    return authSource==='supabase'?login:'/signout-with-chatgpt?return_to='+encodeURIComponent(login);
  }
  async function end(reason:'idle'|'logout',tellOthers=true){
    if(ending.current)return;ending.current=true;
    if(tellOthers){channel.current?.postMessage({type:'logout',reason,from:TAB_ID});try{localStorage.setItem(STORE_LOGOUT,reason+':'+Date.now());}catch{}}
    if(authSource==='supabase'&&tellOthers){try{await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});}catch{}}
    window.location.assign(destination(reason));
  }
  async function heartbeat(){
    lastBeat.current=Date.now();pendingBeat.current=false;
    try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'heartbeat'})});if(r.status===401)void end('idle',true);}catch{}
  }
  function noteActivity(at:number,fromThisTab:boolean){
    if(at<=lastActivity.current)return;
    lastActivity.current=at;
    if(warningRef.current&&!fromThisTab){warningRef.current=false;setWarning(false);}
    if(!fromThisTab)return;
    try{localStorage.setItem(STORE_ACTIVITY,String(at));}catch{}
    channel.current?.postMessage({type:'activity',at,from:TAB_ID});
    // leading heartbeat now; a trailing one at the end of the minute covers the rest of the window
    if(Date.now()-lastBeat.current>=HEARTBEAT_INTERVAL_MS)void heartbeat();else pendingBeat.current=true;
  }
  function stay(){warningRef.current=false;setWarning(false);noteActivity(Date.now(),true);void heartbeat();}

  useEffect(()=>{
    try{const stored=Number(localStorage.getItem(STORE_ACTIVITY)||0);if(stored>lastActivity.current)lastActivity.current=stored;}catch{}
    noteActivity(Date.now(),true); // opening or reloading the portal is a real action
    if('BroadcastChannel' in window){channel.current=new BroadcastChannel('markforth-session');channel.current.onmessage=e=>{const m=e.data||{};if(m.from===TAB_ID)return;if(m.type==='activity')noteActivity(Number(m.at)||0,false);if(m.type==='logout')void end(m.reason==='logout'?'logout':'idle',false);};}
    const onStorage=(e:StorageEvent)=>{if(e.key===STORE_ACTIVITY&&e.newValue)noteActivity(Number(e.newValue),false);if(e.key===STORE_LOGOUT&&e.newValue)void end(e.newValue.startsWith('logout')?'logout':'idle',false);};
    window.addEventListener('storage',onStorage);
    let lastSeen=0;
    const onActivity=()=>{if(warningRef.current||ending.current)return;const now=Date.now();if(now-lastSeen<1000)return;lastSeen=now;noteActivity(now,true);};
    for(const ev of ACTIVITY_EVENTS)window.addEventListener(ev,onActivity,{passive:true,capture:true});
    const check=()=>{
      if(ending.current)return;
      try{const stored=Number(localStorage.getItem(STORE_ACTIVITY)||0);if(stored>lastActivity.current)noteActivity(stored,false);}catch{}
      const now=Date.now(),idle=now-lastActivity.current;
      if(idle>=IDLE_TIMEOUT_MS){void end('idle');return;}
      if(idle>=IDLE_TIMEOUT_MS-IDLE_WARNING_MS){if(!warningRef.current){warningRef.current=true;setWarning(true);}setSecondsLeft(Math.max(0,Math.ceil((IDLE_TIMEOUT_MS-idle)/1000)));}
      // trailing heartbeat, skipped after a long sleep so waking up doesn't extend the session
      if(pendingBeat.current&&now-lastBeat.current>=HEARTBEAT_INTERVAL_MS&&idle<HEARTBEAT_INTERVAL_MS+30000)void heartbeat();
    };
    const timer=setInterval(check,1000);
    const onVisible=()=>{if(document.visibilityState==='visible')check();};
    document.addEventListener('visibilitychange',onVisible);window.addEventListener('focus',check);

    /* If any portal API call says the session is gone, go to sign-in instead of showing a broken screen. */
    const originalFetch=window.fetch;
    window.fetch=async(...args:Parameters<typeof fetch>)=>{
      const response=await originalFetch(...args);
      try{const raw=args[0] instanceof Request?args[0].url:String(args[0]);const url=new URL(raw,window.location.href);if(response.status===401&&url.origin===window.location.origin&&url.pathname.startsWith('/api/')&&url.pathname!=='/api/auth')void end('idle');}catch{}
      return response;
    };
    return()=>{clearInterval(timer);window.removeEventListener('storage',onStorage);for(const ev of ACTIVITY_EVENTS)window.removeEventListener(ev,onActivity,{capture:true});document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('focus',check);channel.current?.close();window.fetch=originalFetch;};
  },[]);

  const announce=secondsLeft===60||secondsLeft===30||secondsLeft===10?`${secondsLeft} seconds left before you are logged out.`:'';
  return <Dialog open={warning} onOpenChange={o=>{if(!o)stay();}}>
    <DialogContent className="mf-dialog idle-dialog" role="alertdialog" showCloseButton={false} onOpenAutoFocus={e=>{e.preventDefault();stayRef.current?.focus();}}>
      <div className="idle-icon"><Clock3 size={24} aria-hidden="true"/></div>
      <DialogTitle asChild><h2>Are you still there?</h2></DialogTitle>
      <DialogDescription>For your security, you’ll be logged out in <b className="idle-count">{secondsLeft} {secondsLeft===1?'second':'seconds'}</b> because there’s been no activity for a while.</DialogDescription>
      <p className="visually-hidden" aria-live="assertive">{announce}</p>
      <div className="idle-bar" aria-hidden="true"><i style={{transform:`scaleX(${secondsLeft/(IDLE_WARNING_MS/1000)})`}}/></div>
      <div className="chat-dialog-actions">
        <button ref={stayRef} type="button" className="primary" onClick={stay}>Stay signed in</button>
        <button type="button" className="secondary" onClick={()=>void end('logout')}><LogOut size={16} aria-hidden="true"/>Log out now</button>
      </div>
    </DialogContent>
  </Dialog>;
}
