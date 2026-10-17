import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { ApiError, unwrap } from './api';
import { nativeGoogle } from './googleNative';
import { clearReminders } from './reminders';
import { advocatePatchToRow, toAdvocate } from './mappers';
import { AUTH_STORAGE_KEY, currentUserId, supabase } from './supabase';
import type { Advocate } from './types';

/**
 * Supabase Auth (FR-AUTH-01..05): email + password and Google. The session (access + refresh token)
 * is persisted by the Supabase client; the advocate profile row is created by a database trigger on
 * sign-up and cached here so the app can open offline.
 */

export type Session = { advocate: Advocate };

const PROFILE_CACHE_KEY = 'vakil.advocate.v2';

function fromAuthError(e: AuthError): ApiError {
  if (e.name === 'AuthRetryableFetchError' || e.status === 0) return new ApiError(0, 'NETWORK', "Can't reach the server. Check your connection and try again.");
  switch (e.code) {
    case 'invalid_credentials':
      return new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    case 'email_not_confirmed':
      return new ApiError(403, 'EMAIL_NOT_CONFIRMED', 'Confirm your email first: open the link we sent you, then sign in.');
    case 'user_already_exists':
    case 'email_exists':
      return new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Try signing in.');
    case 'weak_password':
      return new ApiError(422, 'VALIDATION_ERROR', 'Choose a stronger password.', { password: 'Too weak' });
    case 'same_password':
      return new ApiError(422, 'VALIDATION_ERROR', 'Choose a password different from your current one.', { password: 'Same as before' });
    case 'otp_expired':
      return new ApiError(401, 'INVALID_CODE', 'That code is wrong or has expired. Request a new one.');
    case 'bad_code_verifier':
    case 'flow_state_not_found':
    case 'flow_state_expired':
      return new ApiError(401, 'LINK_EXPIRED', 'This link has expired or was opened on another device. Request a new one from this phone.');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.');
    case 'email_address_not_authorized':
      return new ApiError(403, 'EMAIL_NOT_ALLOWED', "Emails can't be sent to this address yet. The app owner needs to set up email delivery (custom SMTP).");
    case 'provider_disabled':
    case 'email_provider_disabled':
      return new ApiError(403, 'PROVIDER_DISABLED', 'This sign-in method is not enabled yet.');
    case 'signup_disabled':
      return new ApiError(403, 'SIGNUP_DISABLED', 'New sign-ups are closed right now.');
  }
  return new ApiError(e.status ?? 500, e.code ?? 'AUTH_ERROR', e.message || 'Something went wrong. Please try again.');
}

const norm = (email: string) => email.trim().toLowerCase();

function checkEmail(email: string) {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new ApiError(422, 'VALIDATION_ERROR', 'Enter a valid email', { email: 'Invalid' });
}
function checkPassword(password: string) {
  if (password.length < 8) throw new ApiError(422, 'VALIDATION_ERROR', 'Password must be at least 8 characters', { password: 'Too short' });
}

async function cacheProfile(a: Advocate | null) {
  if (a) await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(a));
  else await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
}

async function cachedProfile(userId: string): Promise<Advocate | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    const a = raw ? (JSON.parse(raw) as Advocate) : null;
    return a?.id === userId ? a : null;
  } catch {
    return null;
  }
}

async function loadAdvocate(userId: string): Promise<Advocate> {
  const row = await unwrap(supabase.from('advocates').select('*').eq('id', userId).maybeSingle(), 'Profile');
  if (!row) throw new ApiError(404, 'PROFILE_MISSING', 'Your profile could not be found. Please sign in again.');
  const advocate = toAdvocate(row);
  await cacheProfile(advocate);
  return advocate;
}

/** FR-AUTH-03: restores the saved session at launch. Falls back to the cached profile when offline. */
export async function loadSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  try {
    return { advocate: await loadAdvocate(user.id) };
  } catch (e) {
    const cached = await cachedProfile(user.id);
    if (e instanceof ApiError && e.status === 0 && cached) return { advocate: cached };
    if (e instanceof ApiError && e.status === 0) throw e;
    await logout();
    return null;
  }
}

export type SignUpResult = { status: 'signedIn'; session: Session } | { status: 'confirmEmail'; email: string };

/**
 * Sign up with name, email and password. The name is passed as user metadata; the sign-up trigger
 * copies it onto the advocate profile. When "Confirm email" is on in Supabase, no session is
 * returned until the user opens the confirmation link.
 */
export async function signUp(input: { fullName: string; email: string; password: string }): Promise<SignUpResult> {
  checkEmail(input.email);
  checkPassword(input.password);
  const email = norm(input.email);
  const { data, error } = await supabase.auth.signUp({ email, password: input.password, options: { data: { full_name: input.fullName.trim() } } });
  if (error) throw fromAuthError(error);
  if (!data.session) {
    // With confirmations on, an already-registered email comes back as a user with no identities.
    if (data.user && data.user.identities?.length === 0) throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Try signing in.');
    return { status: 'confirmEmail', email };
  }
  return { status: 'signedIn', session: { advocate: await loadAdvocate(data.session.user.id) } };
}

/** Sends the sign-up confirmation email again. */
export async function resendConfirmation(email: string) {
  checkEmail(email);
  const { error } = await supabase.auth.resend({ type: 'signup', email: norm(email) });
  if (error) throw fromAuthError(error);
  return { sent: true as const };
}

export async function signIn(email: string, password: string): Promise<Session> {
  checkEmail(email);
  checkPassword(password);
  const { data, error } = await supabase.auth.signInWithPassword({ email: norm(email), password });
  if (error) throw fromAuthError(error);
  return { advocate: await loadAdvocate(data.user.id) };
}

/** Where Supabase sends the browser back to after Google (must be in Auth > URL Configuration > Redirect URLs). */
export const authRedirectUrl = (path = 'auth/callback') =>
  Platform.OS === 'web' ? `${window.location.origin}/${path === 'auth/callback' ? '' : path}` : Linking.createURL(path);

// The redirect can arrive twice on Android (auth session result + router deep link): one exchange per code.
const exchanges = new Map<string, Promise<Session>>();

/**
 * Finishes an OAuth redirect: reads ?code= (PKCE) from the URL Supabase redirected to and
 * exchanges it for a session.
 */
export function completeAuthRedirect(url: string): Promise<Session> {
  const { queryParams } = Linking.parse(url);
  const param = (k: string) => {
    const v = queryParams?.[k];
    return Array.isArray(v) ? v[0] : (v ?? undefined);
  };
  const failure = param('error_description') ?? param('error');
  if (failure) return Promise.reject(new ApiError(401, 'OAUTH_ERROR', decodeURIComponent(failure.replace(/\+/g, ' '))));
  const code = param('code');
  if (!code) return Promise.reject(new ApiError(401, 'OAUTH_ERROR', 'Sign-in did not complete. Please try again.'));

  let pending = exchanges.get(code);
  if (!pending) {
    pending = (async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw fromAuthError(error);
      return { advocate: await loadAdvocate(data.user.id) };
    })();
    exchanges.set(code, pending);
  }
  return pending;
}

/** Marks the popup window so the callback route knows to close itself once signed in. */
export const GOOGLE_POPUP_NAME = 'vakil-google';

/**
 * Web: Google opens in a popup. The popup returns to /auth/callback, finishes the sign-in itself and
 * closes; this window learns about it through the Supabase client's cross-tab auth event.
 * Resolves null if the popup is closed without signing in.
 */
async function signInWithGooglePopup(): Promise<Session | null> {
  // Must be opened synchronously inside the click, before any await, or browsers block it.
  const popup = window.open('about:blank', GOOGLE_POPUP_NAME, 'popup=yes,width=500,height=650');
  const redirectTo = `${window.location.origin}/auth/callback?popup=1`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) {
    popup?.close();
    throw error ? fromAuthError(error) : new ApiError(500, 'OAUTH_ERROR', "Couldn't start Google sign-in. Please try again.");
  }
  if (!popup) {
    // Popups are blocked: fall back to a full-page redirect.
    window.location.assign(data.url);
    return null;
  }
  popup.location.href = data.url;

  return new Promise<Session | null>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      sub.data.subscription.unsubscribe();
      clearInterval(timer);
      fn();
    };
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        finish(() => loadAdvocate(session.user.id).then((advocate) => resolve({ advocate }), reject));
      }
    });
    // Closed without signing in (cancelled). Give a just-finished sign-in a moment to arrive first.
    const timer = setInterval(() => {
      if (popup.closed) setTimeout(() => finish(() => resolve(null)), 1200);
    }, 500);
  });
}

/**
 * Native Google account picker -> Google ID token -> Supabase session (signInWithIdToken).
 * Returns undefined when the picker isn't available on this device so the caller can fall back.
 */
async function signInWithGoogleNative(): Promise<Session | null | undefined> {
  const g = nativeGoogle();
  if (!g) return undefined;
  try {
    await g.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await g.GoogleSignin.signIn();
    if (!g.isSuccessResponse(res)) return null; // user closed the picker
    const token = res.data.idToken;
    if (!token) throw new ApiError(500, 'OAUTH_ERROR', "Google didn't return a sign-in token. Please try again.");
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error) throw fromAuthError(error);
    return { advocate: await loadAdvocate(data.user.id) };
  } catch (e) {
    if (g.isErrorWithCode(e)) {
      if (e.code === g.statusCodes.IN_PROGRESS) return null;
      if (e.code === g.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return undefined; // use the browser flow
      // DEVELOPER_ERROR (10): this build's SHA-1 or package name isn't registered on the Android OAuth
      // client, or the web client ID is wrong / deleted. A setup problem, not something the user can fix.
      if (String(e.code) === '10' || /DEVELOPER_ERROR/i.test(String(e.message)))
        throw new ApiError(500, 'GOOGLE_SETUP', 'Google sign-in is not set up for this app build yet (DEVELOPER_ERROR). Use email sign-in for now.');
      throw new ApiError(500, 'OAUTH_ERROR', `Couldn't sign in with Google (${e.code}). Please try again.`);
    }
    throw e;
  }
}

/**
 * Google sign-in / sign-up through Supabase OAuth (no native Google SDK, so it also works in Expo Go).
 * Native: the Google account picker dialog (development / store builds); in Expo Go, where that
 * native module is missing, an in-app browser session instead.
 * Web: opens Google in a popup window.
 * Returns null when the user cancels (or, on web, when popups are blocked and the page redirects instead).
 */
export async function signInWithGoogle(): Promise<Session | null> {
  if (Platform.OS === 'web') return signInWithGooglePopup();
  const native = await signInWithGoogleNative();
  if (native !== undefined) return native;

  const redirectTo = authRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw fromAuthError(error);
  if (!data.url) throw new ApiError(500, 'OAUTH_ERROR', "Couldn't start Google sign-in. Please try again.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  return completeAuthRedirect(result.url);
}

/**
 * Sends the reset email. Supabase never reveals whether the email is registered.
 * The email carries a 6-digit code ({{ .Token }} in the template) and a link back into the app.
 */
export async function requestPasswordReset(email: string) {
  checkEmail(email);
  const { error } = await supabase.auth.resetPasswordForEmail(norm(email), { redirectTo: authRedirectUrl('reset-password') });
  if (error) throw fromAuthError(error);
  return { sent: true as const };
}

async function setNewPasswordAndSignOut(password: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw fromAuthError(error);
  } finally {
    // The recovery session only exists to change the password; the user signs in again afterwards.
    await logout();
  }
}

/** Reset with the code from the email. */
export async function resetPassword(email: string, code: string, password: string) {
  checkPassword(password);
  const { error } = await supabase.auth.verifyOtp({ email: norm(email), token: code.trim(), type: 'recovery' });
  if (error) throw fromAuthError(error);
  await setNewPasswordAndSignOut(password);
  return { ok: true as const };
}

/** Reset after opening the link from the email on this phone (the link carries a one-time ?code=). */
export async function resetPasswordFromLink(linkCode: string, password: string) {
  checkPassword(password);
  const { error } = await supabase.auth.exchangeCodeForSession(linkCode);
  if (error) throw fromAuthError(error);
  await setNewPasswordAndSignOut(password);
  return { ok: true as const };
}

/** A photo picked on the device is uploaded to the avatars bucket; the profile stores its public URL. */
async function uploadAvatar(localUri: string): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  const res = await fetch(localUri);
  const contentType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const body = await res.arrayBuffer();
  const ext = contentType.split('/')[1] ?? 'jpg';
  const path = `${uid}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType, upsert: true });
  if (error) throw new ApiError(500, 'UPLOAD_FAILED', "Couldn't upload your photo. Please try again.");
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

const isLocalFile = (uri?: string) => !!uri && !/^https?:/i.test(uri);

export async function updateProfile(patch: Partial<Advocate>): Promise<Session> {
  const uid = await currentUserId();
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired');
  const p = { ...patch };
  if (isLocalFile(p.avatarUri)) p.avatarUri = await uploadAvatar(p.avatarUri!);
  const row = await unwrap(supabase.from('advocates').update(advocatePatchToRow(p)).eq('id', uid).select('*').single(), 'Profile');
  const advocate = toAdvocate(row);
  await cacheProfile(advocate);
  return { advocate };
}

/** FR-AUTH-05: signs this device out and clears the cached profile. Works offline too. */
export async function logout() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  // signOut keeps the stored session when the server can't be reached; drop it ourselves.
  if (error) await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-code-verifier`, `${AUTH_STORAGE_KEY}-user`]);
  await cacheProfile(null);
  await clearReminders();
  // So the account picker asks again next time instead of reusing the last Google account.
  await nativeGoogle()?.GoogleSignin.signOut().catch(() => undefined);
}

/** Removes every file under the user's folder in a bucket (folders are one level deep: {uid}/{case}/file). */
async function removeUserFiles(bucket: string, uid: string) {
  const storage = supabase.storage.from(bucket);
  const { data: top } = await storage.list(uid, { limit: 1000 });
  const paths: string[] = [];
  for (const item of top ?? []) {
    if (item.id) paths.push(`${uid}/${item.name}`);
    else {
      const { data: inner } = await storage.list(`${uid}/${item.name}`, { limit: 1000 });
      for (const f of inner ?? []) paths.push(`${uid}/${item.name}/${f.name}`);
    }
  }
  if (paths.length) await storage.remove(paths);
}

/** FR-SET-05: deletes the user's files, then the account (every table cascades), then signs out. */
export async function deleteAccount() {
  const uid = await currentUserId();
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired');
  const { error } = await supabase.rpc('delete_account');
  if (error) {
    if (error.code === 'PGRST202') throw new ApiError(501, 'NOT_ENABLED', 'Account deletion is not enabled yet. Email support@vakil.app and we will delete it for you.');
    throw new ApiError(500, error.code || 'SERVER_ERROR', 'Could not delete your account. Please try again.');
  }
  // Files go after the rows: if this fails the account is already gone and the files are unreachable.
  await Promise.all([removeUserFiles('case-docs', uid), removeUserFiles('avatars', uid)]).catch(() => undefined);
  await logout();
}
