import React, { useState } from 'react';
import { Loader2, Waves } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NetworkVisualizer from './NetworkVisualizer';
import '../market-view.css';

type AuthMode = 'login' | 'register' | 'reset-password';

interface LoginScreenProps {
  onBack?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onBack }) => {
  const { login, loginAsGuest, authError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      await login();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      await loginAsGuest();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login' || mode === 'register') {
        setStatusMessage('Email login is not configured. Please use Google Login.');
      } else if (mode === 'reset-password') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatusMessage('Password reset link sent to your email.');
        setTimeout(() => {
            setMode('login');
            setStatusMessage(null);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="market-view min-h-screen w-full flex bg-background text-foreground font-sans selection:bg-[var(--color-accent-primary-subtle)] selection:text-[var(--color-accent-primary)] overflow-hidden relative">
      
      {/* Aura Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl from-orange-500/10 to-pink-500/10 blur-[100px] pointer-events-none z-0" />

      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative overflow-y-auto z-10 bg-background/80 backdrop-blur-sm">
        
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to home
          </button>
        )}

        <div className="w-full max-w-[400px] p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 flex items-center justify-center bg-[var(--color-accent-primary)] rounded-lg shadow-sm">
              <Waves className="w-5 h-5 text-[var(--color-accent-on-accent)]" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">AuraVoice</span>
          </div>

          {/* Heading & Subtext */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create an account' : 'Reset password'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'Enter your details to sign in to your account.' : mode === 'register' ? 'Enter your details to get started.' : 'Enter your email to receive a reset link.'}
            </p>
          </div>

          {/* Social Login (Only for login/register) */}
          {mode !== 'reset-password' && (
            <>
              <div className="grid grid-cols-1 gap-4 mb-6">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>}
                  Continue with Google
                </button>
                <button 
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Continue as Guest
                </button>
              </div>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label htmlFor="name-input" className="block text-sm font-medium text-foreground">Name</label>
                <input 
                  id="name-input"
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email-input" className="block text-sm font-medium text-foreground">Email</label>
              <input 
                id="email-input"
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="name@example.com"
              />
            </div>

            {mode !== 'reset-password' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password-input" className="block text-sm font-medium text-foreground">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('reset-password')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input 
                  id="password-input"
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm" aria-live="polite">
                {authError}
              </div>
            )}

            {statusMessage && (
              <div className="p-3 rounded-md bg-mint/10 border border-mint-border text-mint-foreground text-sm" aria-live="polite">
                {statusMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[var(--color-accent-primary)] text-[var(--color-accent-on-accent)] rounded-md hover:bg-[var(--color-accent-primary-hover)] transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span className="font-medium">
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              </span>
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-foreground hover:underline font-medium">
                  Sign up
                </button>
              </>
            ) : mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-foreground hover:underline font-medium">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Remember your password?{' '}
                <button onClick={() => setMode('login')} className="text-foreground hover:underline font-medium">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Visual/Brand */}
      <div className="hidden lg:flex w-1/2 bg-muted relative overflow-hidden items-center justify-center border-l border-border">
        {/* Cosmic Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[var(--color-accent-primary)]/20 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[600px] bg-[var(--color-accent-secondary)]/10 blur-[100px] rounded-full mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
        </div>

        {/* Interactive Network Visualizer */}
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
          <NetworkVisualizer />
        </div>
        
        <div className="relative z-10 max-w-lg p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-background rounded-2xl shadow-xl flex items-center justify-center mb-8 border border-border">
            <Waves className="w-10 h-10 text-[var(--color-accent-primary)]" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-4">
            The integrated development environment designed for audio perfectionists.
          </h2>
          <p className="text-lg text-muted-foreground">
            Deploy instantly to the edge with zero configuration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
