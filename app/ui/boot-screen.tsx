'use client';
import {CircleAlert,RotateCw} from 'lucide-react';

/* Shown while the workspace loads: a quiet outline of the real layout,
   so nothing jumps when the data arrives. */
export function BootScreen({error}:{error?:string}){
  if(error)return <div className="boot-error">
    <div className="auth-card" role="alert">
      <img className="auth-logo is-visible" src="/brand/markforth-logo.png" width="180" height="36" alt="Markforth"/>
      <span className="boot-error-icon"><CircleAlert size={22} aria-hidden="true"/></span>
      <h1>We couldn’t open your workspace</h1>
      <p className="auth-lede">{error}</p>
      <div className="boot-error-actions">
        <button type="button" className="auth-submit" onClick={()=>window.location.reload()}><RotateCw size={17} aria-hidden="true"/>Try again</button>
        <a className="auth-back" href="/login">Go to sign in</a>
      </div>
    </div>
  </div>;
  return <div className="mf-shell boot-skeleton" aria-busy="true">
    <p className="visually-hidden" role="status">Opening your workspace…</p>
    <div className="mf-sidebar" aria-hidden="true">
      <div className="mf-brand"><img src="/brand/markforth-logo-onblack.png" width="150" height="32" alt=""/><span>Agent workspace</span></div>
      <div className="sk-nav">{Array.from({length:7},(_,i)=><i key={i} className="sk sk-dark"/>)}</div>
    </div>
    <div className="mf-main" aria-hidden="true">
      <div className="mf-topbar"><i className="sk" style={{width:160,height:14}}/><i className="sk" style={{width:150,height:40,marginLeft:'auto',borderRadius:999}}/></div>
      <div className="content">
        <i className="sk" style={{width:140,height:10}}/>
        <i className="sk" style={{width:'min(420px,80%)',height:34,marginTop:14}}/>
        <i className="sk" style={{width:'min(300px,60%)',height:14,marginTop:14}}/>
        <div className="sk-cards">{Array.from({length:4},(_,i)=><i key={i} className="sk sk-card"/>)}</div>
        <i className="sk sk-card" style={{height:260,marginTop:20}}/>
      </div>
    </div>
  </div>;
}
