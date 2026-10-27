import { supabase, hasSupabaseConfig, supabaseUrl, supabaseAnonKey } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthResponse {
  success: boolean;
  needsVerification?: boolean;
  email?: string;
  session?: Session | null;
  user?: User | null;
  error?: string;
  message?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;
const STORAGE_PREFIX = 'speechlab_auth_';

export function validateEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).trim().toLowerCase());
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  return { valid: true };
}

export function getResendCooldownRemaining(email: string): number {
  try {
    const key = `${STORAGE_PREFIX}resend_${email.trim().toLowerCase()}`;
    const timestampStr = localStorage.getItem(key);
    if (!timestampStr) return 0;
    const elapsed = Math.floor((Date.now() - parseInt(timestampStr, 10)) / 1000);
    const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export function recordResendAttempt(email: string): void {
  try {
    const key = `${STORAGE_PREFIX}resend_${email.trim().toLowerCase()}`;
    localStorage.setItem(key, Date.now().toString());
  } catch {
    // Ignore storage issues
  }
}

function isNetworkOrServerUnreachable(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object') {
    const anyErr = err as { name?: string; message?: string; status?: number; code?: string };
    if (anyErr.name === 'AuthRetryableFetchError') return true;
    if (anyErr.status === 0) return true;
    const msg = (anyErr.message || '').toLowerCase();
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('enotfound') ||
      msg.includes('abort') ||
      msg.includes('load failed')
    ) {
      return true;
    }
  }
  return false;
}

function getUnreachableServerMessage(): string {
  const urlDisplay = supabaseUrl || 'the configured URL';
  return `Authentication server unreachable at ${urlDisplay}. Please verify your internet connection, confirm that your Supabase project is active, and check VITE_SUPABASE_URL in .env.`;
}

/**
 * Health check endpoint for the Supabase authentication backend
 */
export async function checkAuthHealth(): Promise<{ healthy: boolean; statusText: string; url: string }> {
  const targetUrl = supabaseUrl || '';
  if (!hasSupabaseConfig || !targetUrl) {
    return {
      healthy: false,
      statusText: 'Supabase credentials missing in .env (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required).',
      url: targetUrl,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${targetUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey || '',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { healthy: true, statusText: 'Backend authentication service is online and healthy.', url: targetUrl };
    }
    return { healthy: false, statusText: `Backend responded with HTTP status ${res.status}.`, url: targetUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      healthy: false,
      statusText: `Backend at ${targetUrl} could not be reached (${msg}). Please verify your VITE_SUPABASE_URL in .env.`,
      url: targetUrl,
    };
  }
}

/**
 * Register a new user with email and password
 */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName) {
    return { success: false, error: 'Full name is required.' };
  }
  if (!validateEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return { success: false, error: passwordCheck.message };
  }

  if (supabase && hasSupabaseConfig) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
          },
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        if (isNetworkOrServerUnreachable(error)) {
          return { success: false, error: getUnreachableServerMessage() };
        }
        return { success: false, error: error.message };
      }

      // Check if user already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      const needsVerification = !data.session || !data.user?.email_confirmed_at;
      recordResendAttempt(cleanEmail);

      return {
        success: true,
        needsVerification,
        email: cleanEmail,
        session: data.session,
        user: data.user,
        message: needsVerification
          ? 'Check your email for a 6-digit verification code to complete your registration.'
          : 'Registration successful!',
      };
    } catch (err: unknown) {
      if (isNetworkOrServerUnreachable(err)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Fallback for development environments without Supabase credentials
  return {
    success: false,
    error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  };
}

/**
 * Verify a 6-digit email OTP
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
  type: 'signup' | 'email' | 'recovery' = 'signup'
): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  if (!cleanToken || cleanToken.length < 6) {
    return { success: false, error: 'Please enter the complete 6-digit verification code.' };
  }

  if (supabase && hasSupabaseConfig) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: type === 'recovery' ? 'recovery' : 'signup',
      });

      if (error) {
        if (isNetworkOrServerUnreachable(error)) {
          return { success: false, error: getUnreachableServerMessage() };
        }

        // If 'signup' fails, attempt 'email' token type fallback (used for magic links / passwordless OTP)
        if (type === 'signup') {
          const secondAttempt = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'email',
          });
          if (!secondAttempt.error && secondAttempt.data.session) {
            return {
              success: true,
              session: secondAttempt.data.session,
              user: secondAttempt.data.user,
              message: 'Account verified successfully!',
            };
          }
        }
        return { success: false, error: error.message || 'Invalid or expired verification code.' };
      }

      return {
        success: true,
        session: data.session,
        user: data.user,
        message: 'Account verified successfully!',
      };
    } catch (err: unknown) {
      if (isNetworkOrServerUnreachable(err)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Verification failed. Please try again.' };
    }
  }

  return {
    success: false,
    error: 'Supabase authentication is not configured. Please check your .env file.',
  };
}

/**
 * Resend verification OTP to email with cooldown rate-limiting
 */
export async function resendVerificationOtp(email: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();

  const remaining = getResendCooldownRemaining(cleanEmail);
  if (remaining > 0) {
    return {
      success: false,
      error: `Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before requesting another code.`,
    };
  }

  if (supabase && hasSupabaseConfig) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        if (isNetworkOrServerUnreachable(error)) {
          return { success: false, error: getUnreachableServerMessage() };
        }
        return { success: false, error: error.message };
      }

      recordResendAttempt(cleanEmail);
      return {
        success: true,
        message: 'A fresh verification code has been dispatched to your email.',
      };
    } catch (err: unknown) {
      if (isNetworkOrServerUnreachable(err)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Failed to resend code.' };
    }
  }

  return {
    success: false,
    error: 'Supabase authentication is not configured. Please check your .env file.',
  };
}

/**
 * Sign in existing user with password or passwordless OTP
 */
export async function signInUser(email: string, password?: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();

  if (!validateEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // Password-based sign in
  if (password !== undefined) {
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (supabase && hasSupabaseConfig) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (isNetworkOrServerUnreachable(error)) {
            return {
              success: false,
              error: getUnreachableServerMessage(),
            };
          }

          // Detect unverified email status
          const errLower = error.message.toLowerCase();
          if (errLower.includes('not confirmed') || errLower.includes('unverified') || errLower.includes('confirm your email')) {
            return {
              success: false,
              needsVerification: true,
              email: cleanEmail,
              error: 'Your email address has not been verified yet. Check your inbox for the 6-digit verification code.',
            };
          }
          return { success: false, error: 'Invalid email address or password. Please check your credentials.' };
        }

        return {
          success: true,
          session: data.session,
          user: data.user,
        };
      } catch (err: unknown) {
        if (isNetworkOrServerUnreachable(err)) {
          return {
            success: false,
            error: getUnreachableServerMessage(),
          };
        }
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    return {
      success: false,
      error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    };
  }

  // Passwordless Email OTP sign in
  if (supabase && hasSupabaseConfig) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        if (isNetworkOrServerUnreachable(error)) {
          return { success: false, error: getUnreachableServerMessage() };
        }
        return { success: false, error: error.message };
      }

      recordResendAttempt(cleanEmail);
      return {
        success: true,
        needsVerification: true,
        email: cleanEmail,
        message: 'A single-use 6-digit sign-in code has been sent to your email address.',
      };
    } catch (err: unknown) {
      if (isNetworkOrServerUnreachable(err)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Failed to send OTP.' };
    }
  }

  return {
    success: false,
    error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  };
}

/**
 * Safe Google OAuth login with connection preflight to prevent "This site can't be reached" errors
 */
export async function signInWithGoogleOAuth(): Promise<{ success: boolean; error?: string; url?: string }> {
  if (!supabase || !hasSupabaseConfig) {
    return {
      success: false,
      error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    };
  }

  try {
    // Check if Google provider is actually enabled in this Supabase project
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        method: 'GET',
        headers: { apikey: supabaseAnonKey || '' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.external && settings.external.google === false) {
          return {
            success: false,
            error: 'Google Sign-In is not enabled yet in your Supabase project. Please use email & password below, or enable Google under Authentication → Providers in your Supabase dashboard.',
          };
        }
      }
    } catch {
      // Continue to OAuth attempt if settings check fails
    }

    // Generate OAuth URL with skipBrowserRedirect so we can safely test reachability
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      if (isNetworkOrServerUnreachable(error)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return {
        success: false,
        error: 'Unable to initialize Google OAuth session. Please ensure Google provider is enabled in your Supabase dashboard.',
      };
    }

    // Safe to redirect
    window.location.assign(data.url);
    return { success: true, url: data.url };

  } catch (err: unknown) {
    if (isNetworkOrServerUnreachable(err)) {
      return { success: false, error: getUnreachableServerMessage() };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Request password recovery email
 */
export async function sendPasswordReset(email: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();

  if (!validateEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const remaining = getResendCooldownRemaining(cleanEmail);
  if (remaining > 0) {
    return {
      success: false,
      error: `Please wait ${remaining} seconds before requesting another recovery code.`,
    };
  }

  if (supabase && hasSupabaseConfig) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        if (isNetworkOrServerUnreachable(error)) {
          return { success: false, error: getUnreachableServerMessage() };
        }
        return { success: false, error: error.message };
      }

      recordResendAttempt(cleanEmail);
      return {
        success: true,
        email: cleanEmail,
        message: 'A password reset link and instructions have been sent to your email.',
      };
    } catch (err: unknown) {
      if (isNetworkOrServerUnreachable(err)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Failed to send recovery email.' };
    }
  }

  return {
    success: false,
    error: 'Supabase authentication is not configured. Please check your .env file.',
  };
}

/**
 * Complete password update after OTP or recovery verification
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  const check = validatePassword(newPassword);
  if (!check.valid) {
    return { success: false, error: check.message };
  }

  if (supabase && hasSupabaseConfig) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (isNetworkOrServerUnreachable(error)) {
          return { success: false, error: getUnreachableServerMessage() };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: data.user,
        message: 'Your password has been successfully updated.',
      };
    } catch (err: unknown) {
      if (isNetworkOrServerUnreachable(err)) {
        return { success: false, error: getUnreachableServerMessage() };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Password update failed.' };
    }
  }

  return {
    success: false,
    error: 'Supabase authentication is not configured. Please check your .env file.',
  };
}

/**
 * Sign out user and terminate session
 */
export async function signOutUser(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors during sign out
    }
  }
}
