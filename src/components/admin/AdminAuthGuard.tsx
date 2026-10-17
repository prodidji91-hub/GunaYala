import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminDashboard } from './AdminDashboard';
import { Lock, Mail, Key, Loader2, AlertCircle, LogOut, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AdminAuthGuardProps {
  onBackToWebsite: () => void;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ onBackToWebsite }) => {
  const [session, setSession] = useState<any>(null);
  const sessionRef = useRef<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(false);

  // Link status / callback state
  const [linkErrorMsg, setLinkErrorMsg] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState<boolean>(false);
  const isPasswordSetupModeRef = useRef<boolean>(false);

  // Password setup state (for invitation acceptance / password recovery)
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordSetupError, setPasswordSetupError] = useState<string | null>(null);
  const [passwordSetupSuccess, setPasswordSetupSuccess] = useState<boolean>(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);

  // Login form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Forgot password form state
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [forgotSuccess, setForgotSuccess] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const updateSessionState = (newSession: any) => {
    setSession(newSession);
    sessionRef.current = newSession;
  };

  const verifyAdminStatus = async (user: any) => {
    if (!user || !user.id || !supabase) {
      setIsAdminAuthorized(false);
      setIsCheckingAdmin(false);
      setIsLoadingAuth(false);
      return;
    }

    setIsCheckingAdmin(true);
    setLoginError(null);
    try {
      // Query membership in public.quotation_admins by authenticated user's UID (user_id)
      const { data, error } = await supabase
        .from('quotation_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error querying quotation_admins:', error);
        setIsAdminAuthorized(false);
      } else if (!data || !data.user_id) {
        console.warn('User UID not found in quotation_admins:', user.id);
        setIsAdminAuthorized(false);
      } else {
        setIsAdminAuthorized(true);
      }
    } catch (err: any) {
      console.error('Error verifying admin status:', err);
      setIsAdminAuthorized(false);
    } finally {
      setIsCheckingAdmin(false);
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoadingAuth(false);
      return;
    }

    const client = supabase;
    let isMounted = true;

    // Inspect URL for tokens, authorization code, or error states
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const errorParam = searchParams.get('error_description') ||
                       hashParams.get('error_description') ||
                       searchParams.get('error') ||
                       hashParams.get('error');

    const authType = searchParams.get('type') || hashParams.get('type');
    const isInviteOrRecovery = authType === 'invite' || authType === 'recovery';
    const authCode = searchParams.get('code');

    // Handle invalid or expired link errors reported in URL
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam.replace(/\+/g, ' '));
      if (isMounted) {
        setLinkErrorMsg(decoded);
        setIsLoadingAuth(false);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // If invitation or recovery tokens are present in URL, activate password setup mode
    if (isInviteOrRecovery) {
      isPasswordSetupModeRef.current = true;
      setIsSettingPassword(true);
      setIsLoadingAuth(true);
    }

    // 1. Register onAuthStateChange listener FIRST so no events are missed
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (newSession) {
        updateSessionState(newSession);
      }

      if (event === 'PASSWORD_RECOVERY') {
        isPasswordSetupModeRef.current = true;
        setIsSettingPassword(true);
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          if (!isPasswordSetupModeRef.current && !isInviteOrRecovery) {
            await verifyAdminStatus(newSession.user);
          } else {
            setIsLoadingAuth(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        updateSessionState(null);
        isPasswordSetupModeRef.current = false;
        setIsAdminAuthorized(false);
        setIsSettingPassword(false);
        setIsLoadingAuth(false);
      }
    });

    // 2. Initialize session: coordinate with Supabase URL detection and avoid duplicate PKCE exchange
    const initSession = async () => {
      try {
        // getSession() automatically awaits initializePromise (which handles detectSessionInUrl)
        const { data: { session: existingSession }, error: getSessionErr } = await client.auth.getSession();

        if (getSessionErr) {
          console.warn('getSession error during initialization:', getSessionErr);
        }

        let resolvedSession = existingSession;

        // If no session returned by auto-detection and authCode is in URL, try single manual exchange
        if (!resolvedSession && authCode) {
          try {
            const { data: exchangeData, error: exchangeErr } = await client.auth.exchangeCodeForSession(authCode);
            if (!exchangeErr && exchangeData.session) {
              resolvedSession = exchangeData.session;
            } else if (exchangeErr) {
              console.warn('Manual exchangeCodeForSession error:', exchangeErr);
              // Only report error if we did not already get a session from onAuthStateChange
              if (!sessionRef.current && isMounted) {
                setLinkErrorMsg(exchangeErr.message || 'Authentication link is invalid or has expired.');
                setIsLoadingAuth(false);
                return;
              }
            }
          } catch (codeErr: any) {
            console.warn('PKCE exchange exception:', codeErr);
          }
        }

        if (!isMounted) return;

        const active = resolvedSession || sessionRef.current;

        if (active?.user) {
          updateSessionState(active);

          if (isInviteOrRecovery || isPasswordSetupModeRef.current) {
            isPasswordSetupModeRef.current = true;
            setIsSettingPassword(true);
            setIsLoadingAuth(false);
          } else {
            await verifyAdminStatus(active.user);
          }
        } else {
          if (isInviteOrRecovery) {
            // Give asynchronous event / token exchange a brief moment to finish before failing
            setTimeout(async () => {
              if (!isMounted) return;
              const { data: retryData } = await client.auth.getSession();
              const latestSession = retryData?.session || sessionRef.current;
              if (latestSession?.user) {
                updateSessionState(latestSession);
                isPasswordSetupModeRef.current = true;
                setIsSettingPassword(true);
                setIsLoadingAuth(false);
              } else {
                setLinkErrorMsg('Your password recovery link is invalid or has expired. Please request a new recovery link.');
                setIsLoadingAuth(false);
              }
            }, 600);
          } else {
            setIsLoadingAuth(false);
          }
        }
      } catch (err: any) {
        console.error('Error during auth initialization:', err);
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError(error.message);
        setIsLoggingIn(false);
        return;
      }

      if (data.session?.user) {
        updateSessionState(data.session);
        await verifyAdminStatus(data.session.user);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Failed to sign in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !forgotEmail) return;
    setIsSendingReset(true);
    setForgotError(null);
    setForgotSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: 'https://gunayala123.netlify.app/admin',
      });

      if (error) {
        setForgotError(error.message);
      } else {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handlePasswordSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (newPassword.length < 8) {
      setPasswordSetupError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordSetupError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordSetupError(null);

    try {
      // 1. Verify current session in Supabase client before calling updateUser
      const { data: sessionData } = await supabase.auth.getSession();
      let activeSession = sessionData?.session || sessionRef.current || session;

      // 2. If Supabase client session is missing but we have state/ref credentials, re-hydrate
      if (!sessionData?.session && activeSession?.access_token && activeSession?.refresh_token) {
        try {
          const { data: restored, error: restoreError } = await supabase.auth.setSession({
            access_token: activeSession.access_token,
            refresh_token: activeSession.refresh_token,
          });
          if (!restoreError && restored.session) {
            activeSession = restored.session;
            updateSessionState(restored.session);
          }
        } catch (err) {
          console.warn('Attempted to restore session before password update:', err);
        }
      }

      if (!activeSession?.user) {
        setPasswordSetupError(
          'Your recovery session has expired or is missing. Please request a new recovery link below.'
        );
        setIsSubmittingPassword(false);
        return;
      }

      // 3. Update the user's password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
          setPasswordSetupError(
            'Your recovery session has expired or is invalid. Please request a fresh password recovery link below.'
          );
        } else {
          setPasswordSetupError(error.message);
        }
        setIsSubmittingPassword(false);
        return;
      }

      setPasswordSetupSuccess(true);
      // Clean tokens from URL bar only after successful password update
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      isPasswordSetupModeRef.current = false;

      // Verify authorization in public.quotation_admins by UID
      const activeUser = data.user || activeSession?.user;
      if (activeUser) {
        await verifyAdminStatus(activeUser);
      }
      setIsSettingPassword(false);
    } catch (err: any) {
      setPasswordSetupError(err?.message || 'Failed to update administrator password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    updateSessionState(null);
    isPasswordSetupModeRef.current = false;
    setIsAdminAuthorized(false);
    setIsSettingPassword(false);
    setLinkErrorMsg(null);
    window.history.replaceState({}, document.title, '/admin');
  };

  // 1. Missing / Unconfigured Supabase state
  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-[#e5dec9] text-center space-y-6">
          <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-[#0e3b2f]">Supabase Configuration Required</h2>
            <p className="text-xs text-[#52606d] leading-relaxed">
              The Guna Yala Quotation CMS requires Supabase credentials (<code className="bg-[#f2ece0] px-1 py-0.5 rounded text-[#0e3b2f]">VITE_SUPABASE_URL</code> and <code className="bg-[#f2ece0] px-1 py-0.5 rounded text-[#0e3b2f]">VITE_SUPABASE_PUBLISHABLE_KEY</code>) to be configured in your environment before access is permitted.
            </p>
          </div>
          <button
            onClick={onBackToWebsite}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#c9a96e]" />
            <span>Return to Public Website</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading state during initial auth check
  if (isLoadingAuth || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0e3b2f]" />
          <span className="text-xs font-mono text-[#52606d] font-medium">
            {isSettingPassword ? 'Authenticating recovery session...' : 'Verifying administrator credentials...'}
          </span>
        </div>
      </div>
    );
  }

  // 3. Invalid or Expired Invitation / Recovery Link State
  if (linkErrorMsg) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-200 text-center space-y-6">
          <div className="w-14 h-14 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-red-900">Recovery Link Expired or Invalid</h2>
            <p className="text-xs text-[#52606d] leading-relaxed">
              {linkErrorMsg}
            </p>
            <p className="text-[11px] text-[#687785] pt-1">
              Please request a fresh password recovery link below.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                setLinkErrorMsg(null);
                setIsSettingPassword(false);
                setIsForgotPassword(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <span>Request New Recovery Link</span>
            </button>
            <button
              onClick={onBackToWebsite}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#f0eae0] hover:bg-[#e6dece] text-[#1c242c] text-xs font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#0e3b2f]" />
              <span>Return to Public Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Invitation Acceptance & "Create New Password" Interface
  if (isSettingPassword) {
    if (!session?.user) {
      return (
        <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0e3b2f]" />
            <span className="text-xs font-mono text-[#52606d] font-medium">Authenticating recovery session...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0e3b2f] flex flex-col items-center justify-center p-4 selection:bg-[#c9a96e] selection:text-[#0e3b2f]">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl border border-[#c9a96e]/30 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0e3b2f] text-[#c9a96e] rounded-lg flex items-center justify-center mx-auto shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#0e3b2f] tracking-wide">
              Create New Password
            </h1>
            <p className="text-xs text-[#687785]">
              Create a new secure password for your administrator account.
            </p>
          </div>

          {passwordSetupError && (
            <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{passwordSetupError}</span>
            </div>
          )}

          {passwordSetupSuccess && (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Password successfully updated! Verifying administrator permissions...</span>
            </div>
          )}

          <form onSubmit={handlePasswordSetupSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Administrator Account</label>
              <input
                type="text"
                disabled
                value={session.user.email || 'Authorized User'}
                className="w-full px-3 py-2 border border-[#cfc7b2] rounded-lg bg-[#f4efe4] text-[#52606d] font-mono cursor-not-allowed text-xs"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Create New Password (min. 8 characters)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5]">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-[#cfc7b2] rounded-lg bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e3b2f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Confirm New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5]">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-[#cfc7b2] rounded-lg bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e3b2f]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              {isSubmittingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                  <span>Saving New Password...</span>
                </>
              ) : (
                <span>Save New Password & Sign In</span>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[#f0eae0] flex justify-between items-center text-xs">
            <button
              onClick={handleLogout}
              className="text-[#52606d] hover:text-red-700 font-medium transition-colors"
            >
              Cancel & Sign Out
            </button>
            <button
              onClick={onBackToWebsite}
              className="text-[#52606d] hover:text-[#0e3b2f] font-medium transition-colors"
            >
              Return to Website →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Forgot Password Interface
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-[#0e3b2f] flex flex-col items-center justify-center p-4 selection:bg-[#c9a96e] selection:text-[#0e3b2f]">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl border border-[#c9a96e]/30 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0e3b2f] text-[#c9a96e] rounded-lg flex items-center justify-center mx-auto shadow">
              <Key className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#0e3b2f] tracking-wide">
              Reset Administrator Password
            </h1>
            <p className="text-xs text-[#687785]">
              Enter your administrator email to receive a secure password reset email.
            </p>
          </div>

          {forgotError && (
            <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{forgotError}</span>
            </div>
          )}

          {forgotSuccess ? (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Password Reset Request Submitted</span>
                </div>
                <p>
                  If an administrator account exists for <strong>{forgotEmail}</strong>, password reset instructions have been sent. Please check your email inbox and click "Reset password" to create your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotSuccess(false);
                }}
                className="w-full py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Return to Admin Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0e3b2f] font-semibold mb-1">Administrator Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@gunayalatravel.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-[#cfc7b2] rounded-lg bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e3b2f]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                    <span>Sending Recovery Email...</span>
                  </>
                ) : (
                  <span>Send Password Reset Email</span>
                )}
              </button>

              <div className="pt-2 border-t border-[#f0eae0] flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setForgotError(null);
                  }}
                  className="text-[#52606d] hover:text-[#0e3b2f] font-medium transition-colors"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={onBackToWebsite}
                  className="text-[#52606d] hover:text-[#0e3b2f] font-medium transition-colors"
                >
                  Return to Website →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 6. Not logged in -> Show Regular Email/Password Login Interface
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0e3b2f] flex flex-col items-center justify-center p-4 selection:bg-[#c9a96e] selection:text-[#0e3b2f]">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl border border-[#c9a96e]/30 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0e3b2f] text-[#c9a96e] rounded-lg flex items-center justify-center mx-auto shadow">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#0e3b2f] tracking-wide">
              Guna Yala Quotation CMS
            </h1>
            <p className="text-xs text-[#687785]">
              Secure Administrator Portal • Authorized Personnel Only
            </p>
          </div>

          {loginError && (
            <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Administrator Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gunayalatravel.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-[#cfc7b2] rounded-lg bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e3b2f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5]">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-[#cfc7b2] rounded-lg bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e3b2f]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In to Admin Portal</span>
              )}
            </button>
          </form>

          {/* Requirement 1: "Forgot password?" link below the existing administrator login form */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotError(null);
                setForgotSuccess(false);
                setIsForgotPassword(true);
              }}
              className="text-xs text-[#0e3b2f] hover:underline font-medium cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          <div className="pt-2 border-t border-[#f0eae0] text-center">
            <button
              onClick={onBackToWebsite}
              className="text-xs text-[#52606d] hover:text-[#0e3b2f] font-medium transition-colors"
            >
              ← Return to Guna Yala Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. Logged in but NOT authorized in public.quotation_admins -> Unauthorized State
  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-200 text-center space-y-6">
          <div className="w-14 h-14 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-red-900">Access Unauthorized</h2>
            <p className="text-xs text-[#52606d] leading-relaxed">
              Your account (<strong className="text-[#1c242c]">{session.user?.email}</strong>) is authenticated, but your user ID (<code className="bg-[#f2ece0] px-1 py-0.5 rounded text-[11px] text-[#0e3b2f]">{session.user?.id}</code>) is not registered in the <code className="bg-[#f2ece0] px-1 py-0.5 rounded text-[#0e3b2f]">quotation_admins</code> table.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Try Another Account</span>
            </button>
            <button
              onClick={onBackToWebsite}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#f0eae0] hover:bg-[#e6dece] text-[#1c242c] text-xs font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#0e3b2f]" />
              <span>Return to Public Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 8. Authorized Admin -> Render AdminDashboard with Logout button
  return (
    <div className="relative">
      <div className="absolute top-3 right-4 z-50 flex items-center gap-3">
        <span className="text-xs font-mono text-[#52606d] bg-white px-2.5 py-1 rounded border border-[#e5dec9] shadow-xs hidden sm:inline-block">
          Logged in as: <strong className="text-[#0e3b2f]">{session.user?.email}</strong>
        </span>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border border-red-200 rounded text-xs font-medium transition-colors shadow-xs cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <AdminDashboard onBackToWebsite={onBackToWebsite} />
    </div>
  );
};
