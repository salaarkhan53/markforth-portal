'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {ArrowRight,ArrowLeft,Mail,LockKeyhole,Eye,EyeOff,Info,CircleAlert,CircleCheck,Check,Circle,LoaderCircle,ShieldCheck,UsersRound,Clock3} from 'lucide-react';
import {LogoutButton} from './ui/app-shell';
import {IDLE_TIMEOUT_MS} from '@/lib/session-config';
const IDLE_MINUTES=Math.round(IDLE_TIMEOUT_MS/60000);

/* Same request helper as before: every auth action posts to /api/auth. */
async function auth(body:any){const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data:any=await response.json();if(!response.ok)throw Error(data.error||'Unable to complete the request.');return data;}

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD=12,MAX_PASSWORD=128;
const REASONS:Record<string,string>={
  idle:`You were logged out after ${IDLE_MINUTES} ${IDLE_MINUTES===1?'minute':'minutes'} of inactivity for your security. Sign in again to continue.`,
  logout:'You’ve been logged out. See you next time.',
};

/* ---------- small building blocks ---------- */
function Notice({tone,children}:{tone:'info'|'error'|'success';children:ReactNode}){
  const Icon=tone==='error'?CircleAlert:tone==='success'?CircleCheck:Info;
  return <div className={'auth-notice is-'+tone} role={tone==='error'?'alert':'status'}><Icon size={18} aria-hidden="true"/><div>{children}</div></div>;
}

function Field({id,label,icon:Icon,error,hint,aside,children}:{id:string;label:string;icon?:LucideIcon;error?:string;hint?:ReactNode;aside?:ReactNode;children:ReactNode}){
  return <div className={'auth-field'+(error?' has-error':'')}>
    <div className="auth-label-row"><label htmlFor={id}>{label}</label>{aside}</div>
    <div className="auth-control">{Icon&&<Icon size={18} aria-hidden="true"/>}{children}</div>
    {error?<p className="auth-field-error" id={id+'-error'}><CircleAlert size={14} aria-hidden="true"/>{error}</p>:hint?<p className="auth-field-hint" id={id+'-hint'}>{hint}</p>:null}
  </div>;
}

function RevealButton({shown,onToggle,controls}:{shown:boolean;onToggle:()=>void;controls:string}){
  return <button type="button" className="auth-reveal" aria-pressed={shown} aria-controls={controls} onClick={onToggle}>
    {shown?<EyeOff size={16} aria-hidden="true"/>:<Eye size={16} aria-hidden="true"/>}{shown?'Hide':'Show'}<span className="visually-hidden"> password</span>
  </button>;
}

function SubmitButton({busy,busyLabel,children}:{busy:boolean;busyLabel:string;children:ReactNode}){
  return <button className="auth-submit" disabled={busy} aria-busy={busy}>
    {busy?<><LoaderCircle className="auth-spin" size={18} aria-hidden="true"/>{busyLabel}</>:<>{children}<ArrowRight size={18} aria-hidden="true"/></>}
  </button>;
}

function BrandPanel(){
  return <section className="auth-story" aria-hidden="true">
    <div className="auth-grid-lines"/>
    <img className="auth-story-logo" src="/brand/markforth-logo-onblack.png" width="190" height="40" alt=""/>
    <div className="auth-story-copy">
      <span className="auth-pill"><i/>Agent workspace</span>
      <p className="auth-word">Move business <span>forward.</span></p>
      <p className="auth-story-lede">Submit leads, follow every decision and see your team’s results in one place.</p>
    </div>
    <ul className="auth-trust">
      <li><UsersRound size={17}/>An individual login for every agent</li>
      <li><ShieldCheck size={17}/>Customer details stay private to your team</li>
      <li><Clock3 size={17}/>Reporting in US Eastern time</li>
    </ul>
  </section>;
}

/* ---------- Sign in / forgot password ---------- */
export function AuthPanel(){
  const [forgot,setForgot]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [reason,setReason]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[shown,setShown]=useState(false);
  const [touched,setTouched]=useState<{email?:boolean;password?:boolean}>({});
  const emailRef=useRef<HTMLInputElement>(null),passwordRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{const r=new URLSearchParams(window.location.search).get('reason')||'';if(REASONS[r])setReason(r);},[]);
  /* Demo copies (DEMO_MODE=1 on the server) offer one-click sample sign-ins. */
  const [demo,setDemo]=useState(false),[demoBusy,setDemoBusy]=useState('');
  useEffect(()=>{fetch('/api/demo').then(r=>r.ok?r.json():null).then((d:any)=>setDemo(!!d?.enabled)).catch(()=>{});},[]);
  async function tryDemo(role:string){setDemoBusy(role);setError('');try{const r=await fetch('/api/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role})});if(!r.ok)throw Error('The demo could not start. Please try again.');window.location.assign('/');}catch(err:any){setError(err.message);setDemoBusy('');}}

  const emailError=!email.trim()?'Enter your email address.':!EMAIL.test(email.trim())?'Enter a valid email address, like name@markforthsol.com.':'';
  const passwordError=!forgot&&!password?'Enter your password.':'';

  function switchMode(){setForgot(v=>!v);setMessage('');setError('');setTouched({});setPassword('');setTimeout(()=>emailRef.current?.focus(),0);}

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setTouched({email:true,password:true});
    if(emailError){emailRef.current?.focus();return;}
    if(passwordError){passwordRef.current?.focus();return;}
    setBusy(true);setError('');setMessage('');
    try{const r=await auth({action:forgot?'forgot':'login',email,password});if(forgot)setMessage(r.message);else window.location.assign('/');}
    catch(err:any){setError(err.message);}
    finally{setBusy(false);}
  }

  const showEmailError=touched.email&&emailError,showPasswordError=touched.password&&passwordError;
  return <div className="auth-shell">
    <BrandPanel/>
    <main className="auth-main">
      <div className="auth-card">
        <img className="auth-logo" src="/brand/markforth-logo.png" width="180" height="36" alt="Markforth"/>
        <p className="auth-eyebrow">Markforth agent portal</p>
        <h1>{forgot?'Reset your password':'Welcome back'}</h1>
        <p className="auth-lede">{forgot?'Enter the email you sign in with. If it belongs to an active account, we’ll email you a link to choose a new password.':'Sign in with the email and password your administrator set up for you.'}</p>
        {demo&&!forgot&&<div className="demo-box"><p><b>This is a test copy with sample data.</b> Pick a role to look around. Nothing here is real, and changes may be reset.</p><div className="demo-actions"><button type="button" className="auth-submit" disabled={!!demoBusy} onClick={()=>tryDemo('admin')}>{demoBusy==='admin'?'Opening…':'Try as Admin'}</button><button type="button" className="secondary demo-agent" disabled={!!demoBusy} onClick={()=>tryDemo('agent')}>{demoBusy==='agent'?'Opening…':'Try as Agent'}</button></div></div>}
        {reason&&!forgot&&<Notice tone="info">{REASONS[reason]}</Notice>}
        <form onSubmit={submit} noValidate>
          <Field id="auth-email" label="Email address" icon={Mail} error={showEmailError?emailError:''}>
            <input ref={emailRef} id="auth-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} required placeholder="name@markforthsol.com"
              value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>setTouched(t=>({...t,email:true}))}
              aria-invalid={!!showEmailError} aria-describedby={showEmailError?'auth-email-error':undefined}/>
          </Field>
          {!forgot&&<Field id="auth-password" label="Password" icon={LockKeyhole} error={showPasswordError?passwordError:''}
            aside={<button type="button" className="auth-text-btn" onClick={switchMode}>Forgot password?</button>}>
            <input ref={passwordRef} id="auth-password" name="password" type={shown?'text':'password'} autoComplete="current-password" required
              value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>setTouched(t=>({...t,password:true}))}
              aria-invalid={!!showPasswordError} aria-describedby={showPasswordError?'auth-password-error':undefined}/>
            <RevealButton shown={shown} onToggle={()=>setShown(v=>!v)} controls="auth-password"/>
          </Field>}
          {error&&<Notice tone="error">{error}</Notice>}
          {message&&<Notice tone="success">{message}</Notice>}
          <SubmitButton busy={busy} busyLabel={forgot?'Sending link…':'Signing in…'}>{forgot?'Send reset link':'Sign in'}</SubmitButton>
        </form>
        {forgot&&<button type="button" className="auth-back" onClick={switchMode}><ArrowLeft size={16} aria-hidden="true"/>Back to sign in</button>}
        <div className="auth-help">
          <p><b>New here?</b> Your administrator creates your account and emails you a temporary password. You’ll choose your own password the first time you sign in.</p>
        </div>
        {!demo&&<p className="auth-owner">Workspace owner? <a href="/signin-with-chatgpt?return_to=%2F" target="_top">Use owner access</a></p>}
      </div>
    </main>
  </div>;
}

/* ---------- New password (shared by reset, first sign-in, account security and owner setup) ---------- */
function NewPasswordFields({busy,error,submitLabel,busyLabel,onSubmit,withCurrent=false}:{busy:boolean;error:string;submitLabel:string;busyLabel:string;onSubmit:(password:string,current:string)=>void;withCurrent?:boolean}){
  const uid=useId().replace(/:/g,'');
  const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[shown,setShown]=useState(false),[tried,setTried]=useState(false);
  const currentRef=useRef<HTMLInputElement>(null),firstRef=useRef<HTMLInputElement>(null),confirmRef=useRef<HTMLInputElement>(null);
  const currentError=tried&&withCurrent&&!current?'Enter your current password.':'';
  const longEnough=password.length>=MIN_PASSWORD,matches=confirm.length>0&&password===confirm;
  const passwordError=tried&&!longEnough?`Use at least ${MIN_PASSWORD} characters.`:'';
  const confirmError=tried&&longEnough&&!matches?(confirm?'The passwords don’t match yet.':'Type the same password again.'):'';
  function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setTried(true);
    if(withCurrent&&!current){currentRef.current?.focus();return;}
    if(!longEnough){firstRef.current?.focus();return;}
    if(!matches){confirmRef.current?.focus();return;}
    onSubmit(password,current);
  }
  return <form onSubmit={submit} noValidate>
    {withCurrent&&<Field id={uid+'-current'} label="Current password" icon={LockKeyhole} error={currentError}>
      <input ref={currentRef} id={uid+'-current'} name="currentPassword" type={shown?'text':'password'} maxLength={MAX_PASSWORD} autoComplete="current-password" required
        value={current} onChange={e=>setCurrent(e.target.value)} aria-invalid={!!currentError} aria-describedby={currentError?uid+'-current-error':undefined}/>
    </Field>}
    <Field id={uid+'-new'} label="New password" icon={LockKeyhole} error={passwordError}>
      <input ref={firstRef} id={uid+'-new'} name="password" type={shown?'text':'password'} minLength={MIN_PASSWORD} maxLength={MAX_PASSWORD} autoComplete="new-password" required
        value={password} onChange={e=>setPassword(e.target.value)} aria-invalid={!!passwordError} aria-describedby={uid+'-rules'+(passwordError?' '+uid+'-new-error':'')}/>
      <RevealButton shown={shown} onToggle={()=>setShown(v=>!v)} controls={uid+'-new'}/>
    </Field>
    <Field id={uid+'-confirm'} label="Confirm new password" icon={LockKeyhole} error={confirmError}>
      <input ref={confirmRef} id={uid+'-confirm'} name="confirm" type={shown?'text':'password'} minLength={MIN_PASSWORD} maxLength={MAX_PASSWORD} autoComplete="new-password" required
        value={confirm} onChange={e=>setConfirm(e.target.value)} aria-invalid={!!confirmError} aria-describedby={confirmError?uid+'-confirm-error':undefined}/>
    </Field>
    <ul className="auth-rules" id={uid+'-rules'} aria-label="Password requirements">
      <li className={longEnough?'is-met':''}>{longEnough?<Check size={15} aria-hidden="true"/>:<Circle size={15} aria-hidden="true"/>}At least {MIN_PASSWORD} characters<span className="visually-hidden">{longEnough?' (done)':' (not yet)'}</span></li>
      <li className={matches?'is-met':''}>{matches?<Check size={15} aria-hidden="true"/>:<Circle size={15} aria-hidden="true"/>}Both passwords match<span className="visually-hidden">{matches?' (done)':' (not yet)'}</span></li>
    </ul>
    {error&&<Notice tone="error">{error}</Notice>}
    <SubmitButton busy={busy} busyLabel={busyLabel}>{submitLabel}</SubmitButton>
  </form>;
}

export function PasswordPanel({recovery=false,forced=false}:{recovery?:boolean,forced?:boolean}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[token,setToken]=useState({tokenHash:'',accessToken:''});
  useEffect(()=>{if(!recovery)return;const query=new URLSearchParams(window.location.search),fragment=new URLSearchParams(window.location.hash.slice(1));setToken({tokenHash:query.get('token_hash')||'',accessToken:fragment.get('access_token')||''});window.history.replaceState(null,'',window.location.pathname);},[recovery]);
  async function save(password:string){setError('');setBusy(true);try{await auth({action:recovery?'completeRecovery':'changePassword',password,...token});window.location.assign('/');}catch(err:any){setError(err.message);}finally{setBusy(false);}}
  const embedded=!recovery&&!forced;
  const title=recovery?'Choose a new password':forced?'Set your own password':'Change your password';
  const lede=recovery?'Pick a new password for your Markforth account. You’ll be signed in when you save it.'
    :forced?'You signed in with a temporary password from your administrator. Choose your own password to open the workspace.'
    :'Choose a new password for your account. Saving it signs you out on every other device.';
  const fields=<NewPasswordFields busy={busy} error={error} submitLabel="Save password" busyLabel="Saving…" onSubmit={save}/>;
  if(embedded)return <section className="panel auth-panel-embedded"><h2>{title}</h2><p className="auth-lede">{lede}</p>{fields}</section>;
  return <div className="password-shell">
    <div className="auth-card">
      <img className="auth-logo is-visible" src="/brand/markforth-logo.png" width="180" height="36" alt="Markforth"/>
      <p className="auth-eyebrow">Account security</p>
      <h1>{title}</h1>
      <p className="auth-lede">{lede}</p>
      {fields}
      {recovery?<a className="auth-back" href="/login"><ArrowLeft size={16} aria-hidden="true"/>Back to sign in</a>
        :<div className="auth-forced-exit"><span>Not you, or want to finish later?</span><LogoutButton authSource="supabase" className="auth-text-btn auth-logout-link"/></div>}
    </div>
  </div>;
}

export function OwnerPasswordSetup(){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function create(password:string){setBusy(true);setError('');try{const r=await auth({action:'ownerSignup',password});setMessage(r.message);}catch(err:any){setError(err.message);}finally{setBusy(false);}}
  return <div className="auth-modal-body">
    <h2>Create your administrator login</h2>
    <p className="auth-lede">This creates a separate portal password for your owner email. You may need to confirm that email before signing in.</p>
    {message?<Notice tone="success">{message}</Notice>:<NewPasswordFields busy={busy} error={error} submitLabel="Create administrator login" busyLabel="Creating…" onSubmit={create}/>}
    <p className="auth-owner"><a href="/login">Sign in with portal password</a></p>
  </div>;
}

/* Used by the profile menu: change a password you already chose (needs the current one). */
export function ChangePasswordForm({onDone}:{onDone:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(password:string,current:string){setError('');setBusy(true);try{await auth({action:'changePassword',currentPassword:current,password});onDone();}catch(err:any){setError(err.message);}finally{setBusy(false);}}
  return <NewPasswordFields withCurrent busy={busy} error={error} submitLabel="Change password" busyLabel="Saving…" onSubmit={save}/>;
}
