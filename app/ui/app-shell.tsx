'use client';
import {useRef,useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {TOUR_EVENT} from './welcome-tour';
import {broadcastLogout} from './idle-guard';
import {Sparkles,LayoutDashboard,FilePlus,ListChecks,ChartNoAxesColumn,Trophy,MessageSquare,Zap,KeyRound,Users,Upload,PhoneCall,PhoneForwarded,Mail,LogOut,Menu,ChevronDown,ChevronRight,UserPen} from 'lucide-react';
import {Sheet,SheetTrigger,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuItem,DropdownMenuSeparator} from '@/components/ui/dropdown-menu';

/* Tab names must match the tab ids used in portal.tsx. */
type Group='Work'|'Team'|'Admin'|'Account';
type NavItem={name:string;icon:LucideIcon;group:Group;adminOnly?:boolean;passwordOnly?:boolean};
const NAV:NavItem[]=[
  {name:'Overview',icon:LayoutDashboard,group:'Work'},
  {name:'Submit a lead',icon:FilePlus,group:'Work'},
  {name:'Lead pipeline',icon:ListChecks,group:'Work'},
  {name:'DID tracking',icon:ChartNoAxesColumn,group:'Work'},
  {name:'Leaderboard',icon:Trophy,group:'Team'},
  {name:'Team chat',icon:MessageSquare,group:'Team'},
  {name:'Power hour',icon:Zap,group:'Team'},
  {name:'Team members',icon:Users,group:'Admin',adminOnly:true},
  {name:'Call activity',icon:PhoneCall,group:'Admin',adminOnly:true},
  {name:'Import data',icon:Upload,group:'Admin',adminOnly:true},
  {name:'DID directory',icon:PhoneForwarded,group:'Admin',adminOnly:true},
  {name:'Email delivery',icon:Mail,group:'Admin',adminOnly:true},
];
const GROUPS:Group[]=['Work','Team','Admin','Account'];

export type ShellProps={
  tab:string;
  onNavigate:(tab:string)=>void;
  admin:boolean;
  authSource:string;
  member:{name:string;email:string};
  counts:{chat:number;pending:number};
  photoUrl?:string|null;
  onEditProfile:()=>void;
  onChangePassword:()=>void;
};

export function visibleNav(admin:boolean,authSource:string){return NAV.filter(i=>(!i.adminOnly||admin)&&(!i.passwordOnly||authSource==='supabase'));}
export function navIcon(tab:string):LucideIcon{return NAV.find(i=>i.name===tab)?.icon||LayoutDashboard;}
export function groupOf(tab:string){return NAV.find(i=>i.name===tab)?.group||'Work';}
const initials=(name:string)=>name.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const roleLabel=(admin:boolean)=>admin?'Administrator':'Agent';

/* Logout keeps the original behaviour: password sessions call the auth API,
   workspace-owner (ChatGPT) sessions go through the platform sign-out route. */
const OWNER_SIGNOUT='/signout-with-chatgpt?return_to='+encodeURIComponent('/login?reason=logout');
function useLogout(){
  const [busy,setBusy]=useState(false);
  async function logout(){
    if(busy)return;setBusy(true);broadcastLogout('logout');
    try{await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});}catch{}
    window.location.assign('/login?reason=logout');
  }
  return {busy,logout};
}

export function LogoutButton({authSource,className='mf-logout'}:{authSource:string;className?:string}){
  const {busy,logout}=useLogout();
  if(authSource==='chatgpt')return <a className={className} href={OWNER_SIGNOUT} target="_top" onClick={()=>broadcastLogout('logout')}><LogOut size={17} aria-hidden="true"/>Log out</a>;
  return <button type="button" className={className} onClick={logout} disabled={busy}><LogOut size={17} aria-hidden="true"/>{busy?'Logging out…':'Log out'}</button>;
}

function Avatar({name,photoUrl,className='mf-avatar'}:{name:string;photoUrl?:string|null;className?:string}){return <span className={className} aria-hidden="true">{photoUrl?<img src={photoUrl} alt=""/>:initials(name)}</span>;}

function NavList({tab,onNavigate,admin,authSource,counts}:ShellProps){
  const items=visibleNav(admin,authSource);
  return <nav className="mf-nav" aria-label="Portal sections">
    {GROUPS.map(group=>{const list=items.filter(i=>i.group===group);if(!list.length)return null;return <div className="mf-nav-group" key={group}>
      <p className="mf-nav-label" id={'nav-'+group}>{group==='Admin'?'Admin tools':group}</p>
      <ul aria-labelledby={'nav-'+group}>{list.map(({name,icon:Icon})=>{const active=tab===name;const count=name==='Team chat'?counts.chat:name==='Lead pipeline'?counts.pending:0;
        return <li key={name}><button type="button" className={'mf-nav-item'+(active?' is-active':'')} aria-current={active?'page':undefined} onClick={()=>onNavigate(name)}>
          <Icon size={18} aria-hidden="true"/><span>{name}</span>
          {count>0&&<span className="mf-count">{count>99?'99+':count}<span className="visually-hidden">{name==='Team chat'?' unread messages':' leads awaiting review'}</span></span>}
        </button></li>;})}</ul>
    </div>;})}
  </nav>;
}

function SidebarBody(props:ShellProps){
  return <>
    <div className="mf-brand"><img src="/brand/markforth-logo-onblack.png" width="150" height="32" alt="Markforth"/><span>Agent workspace</span></div>
    <NavList {...props}/>
  </>;
}

export function Sidebar(props:ShellProps){return <aside className="mf-sidebar" aria-label="Sidebar"><SidebarBody {...props}/></aside>;}

function MobileNav(props:ShellProps){
  const [open,setOpen]=useState(false);
  const picked=useRef(false);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><button type="button" className="mf-menu-btn"><Menu size={18} aria-hidden="true"/>Menu</button></SheetTrigger>
    <SheetContent side="left" className="mf-sheet data-[state=open]:duration-300 data-[state=closed]:duration-200"
      onCloseAutoFocus={e=>{if(!picked.current)return;picked.current=false;e.preventDefault();document.getElementById('page-title')?.focus({preventScroll:true});}}>
      <SheetTitle className="visually-hidden">Portal menu</SheetTitle>
      <SheetDescription className="visually-hidden">Choose a section of the portal.</SheetDescription>
      <div className="mf-sidebar mf-sidebar--sheet"><SidebarBody {...props} onNavigate={t=>{picked.current=true;setOpen(false);props.onNavigate(t);}}/></div>
    </SheetContent>
  </Sheet>;
}

function UserMenu({member,admin,authSource,photoUrl,onEditProfile,onChangePassword}:ShellProps){
  const {busy,logout}=useLogout();
  return <DropdownMenu>
    <DropdownMenuTrigger className="mf-usermenu-trigger" aria-label={`Account menu for ${member.name}, ${roleLabel(admin)}`}>
      <Avatar name={member.name} photoUrl={photoUrl}/><span className="mf-usermenu-text"><b>{member.name}</b><small>{roleLabel(admin)}</small></span><ChevronDown size={16} aria-hidden="true"/>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="mf-menu">
      <DropdownMenuLabel className="mf-menu-label"><Avatar name={member.name} photoUrl={photoUrl} className="mf-avatar mf-menu-avatar"/><span><span className="mf-menu-name"><b>{member.name}</b><span className="mf-role-chip">{roleLabel(admin)}</span></span><small>{member.email}</small></span></DropdownMenuLabel>
      <DropdownMenuSeparator/>
      <DropdownMenuItem className="mf-menu-item" onSelect={onEditProfile}><UserPen aria-hidden="true"/>Edit profile</DropdownMenuItem>
      <DropdownMenuItem className="mf-menu-item" onSelect={onChangePassword}><KeyRound aria-hidden="true"/>Change password</DropdownMenuItem>
      {!admin&&<DropdownMenuItem className="mf-menu-item" onSelect={()=>window.dispatchEvent(new Event(TOUR_EVENT))}><Sparkles aria-hidden="true"/>Take the tour again</DropdownMenuItem>}
      <DropdownMenuSeparator/>
      {authSource!=='chatgpt'
        ?<DropdownMenuItem className="mf-menu-item mf-menu-item--logout" disabled={busy} onSelect={e=>{e.preventDefault();void logout();}}><LogOut aria-hidden="true"/>{busy?'Logging out…':'Log out'}</DropdownMenuItem>
        :<DropdownMenuItem className="mf-menu-item mf-menu-item--logout" asChild><a href={OWNER_SIGNOUT} target="_top" onClick={()=>broadcastLogout('logout')}><LogOut aria-hidden="true"/>Log out</a></DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function TopBar(props:ShellProps){
  const group=groupOf(props.tab);
  return <header className="mf-topbar">
    <MobileNav {...props}/>
    <p className="mf-crumb"><span>{group==='Admin'?'Admin tools':group}</span><ChevronRight size={14} aria-hidden="true"/><b>{props.tab}</b></p>
    <div className="mf-topbar-end">{props.authSource==='demo'&&<span className="mf-demo-chip">Demo · sample data</span>}<UserMenu {...props}/></div>
  </header>;
}
