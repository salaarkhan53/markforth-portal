import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';

/* Demo mode: only for a public test copy of the portal.
   It is OFF unless the server setting DEMO_MODE is exactly "1". Never set it on the live portal.
   When on, the login page offers "Try as Admin" / "Try as Agent" sign-ins backed by sample data. */
export const DEMO_COOKIE = 'markforth-demo';
export const DEMO_USERS = {
  admin: {email: 'demo.admin@markforth.demo', name: 'Demo Admin'},
  agent: {email: 'demo.agent@markforth.demo', name: 'Demo Agent'},
} as const;
export type DemoRole = keyof typeof DEMO_USERS;

export function demoEnabled() {
  return env.DEMO_MODE === '1';
}

export async function demoIdentity() {
  if (!demoEnabled()) return null;
  const value = (await cookies()).get(DEMO_COOKIE)?.value;
  if (value !== 'admin' && value !== 'agent') return null;
  const user = DEMO_USERS[value];
  return {userId: 'demo-' + value, email: user.email, displayName: user.name, fullName: user.name, accessToken: null, source: 'demo'};
}

export async function clearDemoCookie() {
  const jar = await cookies();
  if (jar.get(DEMO_COOKIE)) jar.set(DEMO_COOKIE, '', {httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0});
}
