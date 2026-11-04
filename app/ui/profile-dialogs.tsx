'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,Trash2,CircleAlert,Info} from 'lucide-react';
import {toast} from 'sonner';
import {SimpleDialog} from './simple-dialog';
import {ChangePasswordForm} from '../auth-panels';
import {prepareAgentPhoto} from '../power-experience';

const MAX_PHOTO_BYTES=2*1024*1024;
const PHOTO_TYPES=['image/jpeg','image/png','image/webp'];
const initials=(name:string)=>name.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const todayISO=()=>new Date().toISOString().slice(0,10);

/* Edit your own name, date of birth (optional) and photo (optional, up to 2 MB). */
export function EditProfileDialog({open,onClose,member,photoUrl,busy,save}:{open:boolean;onClose:()=>void;member:{name:string;email:string;dob?:string|null};photoUrl?:string|null;busy:boolean;save:(body:any)=>Promise<boolean>}){
  const [name,setName]=useState(member.name),[dob,setDob]=useState(member.dob||''),[image,setImage]=useState<string|null>(null),[removed,setRemoved]=useState(false),[photoError,setPhotoError]=useState(''),[nameError,setNameError]=useState(''),[reading,setReading]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null),nameRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(open){setName(member.name);setDob(member.dob||'');setImage(null);setRemoved(false);setPhotoError('');setNameError('');}},[open]);
  const preview=image||(removed?null:photoUrl||null);

  async function choose(file?:File){
    setPhotoError('');if(!file)return;
    if(!PHOTO_TYPES.includes(file.type)){setPhotoError('Choose a JPEG, PNG or WebP photo.');return;}
    if(file.size>MAX_PHOTO_BYTES){setPhotoError(`That photo is ${(file.size/1024/1024).toFixed(1)} MB. Choose one up to 2 MB.`);return;}
    setReading(true);try{setImage(await prepareAgentPhoto(file));setRemoved(false);}catch(e:any){setPhotoError(e.message||'This photo could not be used. Try another one.');}finally{setReading(false);if(fileRef.current)fileRef.current.value='';}
  }
  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!name.trim()){setNameError('Enter your name.');nameRef.current?.focus();return;}
    const ok=await save({action:'profile',name:name.trim(),dob,...(image?{image}:{}),...(removed&&!image?{removePhoto:true}:{})});
    if(ok)onClose();
  }

  return <SimpleDialog open={open} onClose={onClose} title="Edit profile" className="profile-dialog">
    <h2>Edit profile</h2>
    <p className="profile-lede">Your name and photo show on the leaderboard, in team chat and on new leads.</p>
    <form onSubmit={submit} noValidate>
      <div className="profile-photo">
        <span className="profile-avatar" aria-hidden="true">{preview?<img src={preview} alt=""/>:initials(name||member.name)}</span>
        <div>
          <p className="profile-photo-label">Profile photo <span className="optional">optional</span></p>
          <div className="profile-photo-actions">
            <label className="secondary btn-sm file-button"><Camera size={15} aria-hidden="true"/>{reading?'Preparing…':preview?'Change photo':'Upload photo'}<input ref={fileRef} type="file" className="visually-hidden" accept="image/jpeg,image/png,image/webp" disabled={busy||reading} onChange={e=>choose(e.target.files?.[0])} aria-describedby="profile-photo-hint"/></label>
            {preview&&<button type="button" className="text-btn danger" onClick={()=>{setImage(null);setRemoved(true);setPhotoError('');}}><Trash2 size={15} aria-hidden="true"/>Remove photo</button>}
          </div>
          {photoError?<p className="field-error" role="alert"><CircleAlert size={14} aria-hidden="true"/>{photoError}</p>:<p className="field-hint" id="profile-photo-hint">JPEG, PNG or WebP, up to 2 MB. It’s cropped to a square.</p>}
        </div>
      </div>
      <div className="form-grid">
        <div className="field wide"><label htmlFor="profile-name">Full name</label><input ref={nameRef} id="profile-name" value={name} maxLength={100} autoComplete="name" required onChange={e=>{setName(e.target.value);if(nameError)setNameError('');}} aria-invalid={nameError?true:undefined} aria-describedby={nameError?'profile-name-error':undefined}/>{nameError&&<p className="field-error" id="profile-name-error"><CircleAlert size={14} aria-hidden="true"/>{nameError}</p>}</div>
        <div className="field wide"><label htmlFor="profile-dob">Date of birth <span className="optional">optional</span></label><input id="profile-dob" type="date" value={dob} max={todayISO()} min="1900-01-01" onChange={e=>setDob(e.target.value)}/>{dob&&<button type="button" className="text-btn profile-clear" onClick={()=>setDob('')}>Clear date of birth</button>}</div>
      </div>
      <p className="field-hint profile-email">Sign-in email: <b>{member.email}</b>. Ask an administrator if this needs to change.</p>
      <div className="chat-dialog-actions"><button className="primary" disabled={busy||reading}>{busy?'Saving…':'Save profile'}</button><button type="button" className="secondary" onClick={onClose}>Cancel</button></div>
    </form>
  </SimpleDialog>;
}

/* Change a password you already chose. Owner (ChatGPT) sign-ins have no portal password. */
export function ChangePasswordDialog({open,onClose,authSource}:{open:boolean;onClose:()=>void;authSource:string}){
  return <SimpleDialog open={open} onClose={onClose} title="Change password" className="profile-dialog">
    <h2>Change password</h2>
    {authSource==='supabase'?<>
      <p className="profile-lede">Enter your current password, then choose a new one. Saving signs you out on your other devices.</p>
      <ChangePasswordForm key={String(open)} onDone={()=>{toast.success('Your password has been changed.');onClose();}}/>
    </>:<div className="auth-notice is-info" role="status"><Info size={18} aria-hidden="true"/><div>{authSource==='demo'?'Demo accounts don’t have a password, so there’s nothing to change here. On the real portal, this is where you change yours.':'You’re signed in with workspace-owner access, which doesn’t use a portal password. Sign in with your portal email and password to change it here.'}</div></div>}
  </SimpleDialog>;
}
