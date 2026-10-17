import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminDashboard } from './AdminDashboard';
import { Lock, Mail, Key, Loader2, AlertCircle, LogOut, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AdminAuthGuardProps {
  onBackToWebsite: () => void;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ onBackToWebsite }) => {
  const [session, setSession] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(false);

  // Link status / callback state
  const [linkErrorMsg, setLinkErrorMsg] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState<boolean>(false);

  // Password setup state (for invitation acceptance / recovery)
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

    // Handle invalid or expired links
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam.replace(/\+/g, ' '));
      setLinkErrorMsg(decoded);
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoadingAuth(false);
      return;
    }

    // Process PKCE authorization code if present
    if (authCode) {
      supabase.auth.exchangeCodeForSession(authCode)
        .then(async ({ data, error }) => {
          window.history.replaceState({}, document.title, window.location.pathname);
          if (error) {
            setLinkErrorMsg(error.message || 'Invitation link is invalid or has expired.');
            setIsLoadingAuth(false);
          } else if (data.session?.user) {
            setSession(data.session);
            if (isInviteOrRecovery) {
              setIsSettingPassword(true);
              setIsLoadingAuth(false);
            } else {
              await verifyAdminStatus(data.session.user);
            }
          }
        })
        .catch((err) => {
          setLinkErrorMsg(err?.message || 'Failed to exchange authorization code.');
          setIsLoadingAuth(false);
        });
      return;
    }

    // If invitation hash is detected in URL, prepare password setup mode
    if (isInviteOrRecovery) {
      setIsSettingPassword(true);
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        if (isInviteOrRecovery) {
          setIsSettingPassword(true);
          setIsLoadingAuth(false);
        } else {
          verifyAdminStatus(session.user);
        }
      } else {
        setIsLoadingAuth(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (event === 'PASSWORD_RECOVERY') {
        setIsSettingPassword(true);
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          if (!isSettingPassword) {
            await verifyAdminStatus(newSession.user);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsAdminAuthorized(false);
        setIsSettingPassword(false);
        setIsLoadingAuth(false);
      }
    });

    return () => {
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
        await verifyAdminStatus(data.session.user);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Failed to sign in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !session?.user) return;

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
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordSetupError(error.message);
        setIsSubmittingPassword(false);
        return;
      }

      setPasswordSetupSuccess(true);
      // Clean up address bar
      window.history.replaceState({}, document.title, window.location.pathname);

      // Verify authorization in public.quotation_admins by UID
      if (data.user) {
        await verifyAdminStatus(data.user);
      } else if (session?.user) {
        await verifyAdminStatus(session.user);
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
    setSession(null);
    setIsAdminAuthorized(false);
    setIsSettingPassword(false);
    setLinkErrorMsg(null);
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

  // 2. Loading state during auth check
  if (isLoadingAuth || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0e3b2f]" />
          <span className="text-xs font-mono text-[#52606d] font-medium">Verifying administrator credentials...</span>
        </div>
      </div>
    );
  }

  // 3. Invalid or Expired Invitation Link State
  if (linkErrorMsg) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-200 text-center space-y-6">
          <div className="w-14 h-14 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-red-900">Invitation Link Expired or Invalid</h2>
            <p className="text-xs text-[#52606d] leading-relaxed">
              {linkErrorMsg}
            </p>
            <p className="text-[11px] text-[#687785] pt-1">
              Please contact the system administrator or request a new invitation link.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                setLinkErrorMsg(null);
                setIsSettingPassword(false);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <span>Go to Admin Sign In</span>
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

  // 4. Invitation Acceptance & Password Setup Interface
  if (isSettingPassword && session?.user) {
    return (
      <div className="min-h-screen bg-[#0e3b2f] flex flex-col items-center justify-center p-4 selection:bg-[#c9a96e] selection:text-[#0e3b2f]">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl border border-[#c9a96e]/30 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#0e3b2f] text-[#c9a96e] rounded-lg flex items-center justify-center mx-auto shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#0e3b2f] tracking-wide">
              Complete Administrator Setup
            </h1>
            <p className="text-xs text-[#687785]">
              Set a secure password for your administrator account.
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
              <span>Password successfully established! Verifying authorization...</span>
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
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              {isSubmittingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                  <span>Saving Password & Activating Account...</span>
                </>
              ) : (
                <span>Activate Account & Enter CMS</span>
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

  // 5. Not logged in -> Show Regular Email/Password Login Interface
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
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
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

  // 6. Logged in but NOT authorized in public.quotation_admins -> Unauthorized State
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
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

  // 7. Authorized Admin -> Render AdminDashboard with Logout button
  return (
    <div className="relative">
      <div className="absolute top-3 right-4 z-50 flex items-center gap-3">
        <span className="text-xs font-mono text-[#52606d] bg-white px-2.5 py-1 rounded border border-[#e5dec9] shadow-xs hidden sm:inline-block">
          Logged in as: <strong className="text-[#0e3b2f]">{session.user?.email}</strong>
        </span>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border border-red-200 rounded text-xs font-medium transition-colors shadow-xs"
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
