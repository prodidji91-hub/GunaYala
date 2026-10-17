import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminDashboard } from './AdminDashboard';
import { Lock, Mail, Key, Loader2, AlertCircle, LogOut, ArrowLeft } from 'lucide-react';

interface AdminAuthGuardProps {
  onBackToWebsite: () => void;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ onBackToWebsite }) => {
  const [session, setSession] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(false);
  
  // Login form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoadingAuth(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        verifyAdminStatus(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        verifyAdminStatus(session.user);
      } else {
        setIsAdminAuthorized(false);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const verifyAdminStatus = async (user: any) => {
    setIsCheckingAdmin(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase!
        .from('quotation_admins')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error || !data) {
        console.warn('User not found in quotation_admins:', user.email, error);
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

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setIsAdminAuthorized(false);
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

  // 3. Not logged in -> Show Login Interface
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

  // 4. Logged in but NOT authorized in quotation_admins table -> Unauthorized State
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
              Your account (<strong className="text-[#1c242c]">{session.user?.email}</strong>) is authenticated with Supabase, but is not listed as an authorized administrator in the <code className="bg-[#f2ece0] px-1 py-0.5 rounded text-[#0e3b2f]">quotation_admins</code> table.
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

  // 5. Authorized Admin -> Render AdminDashboard with Logout button
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
