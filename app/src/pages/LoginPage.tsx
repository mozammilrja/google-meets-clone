import { useState } from 'react';
import { Video } from 'lucide-react';
import { LoginForm, SignupForm, ForgotPasswordForm } from '@/components/auth';
import { ThemeToggle } from '@/components/ui/custom/ThemeToggle';

type AuthView = 'login' | 'signup' | 'forgot-password';

export function LoginPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">MeetClone</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
            {view === 'login' && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to continue to your meetings</p>
                </div>
                <LoginForm onForgotPassword={() => setView('forgot-password')} onSignup={() => setView('signup')} />
              </>
            )}
            {view === 'signup' && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Get started with free video meetings</p>
                </div>
                <SignupForm onLogin={() => setView('login')} />
              </>
            )}
            {view === 'forgot-password' && <ForgotPasswordForm onBack={() => setView('login')} />}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} MeetClone. All rights reserved.</p>
      </footer>
    </div>
  );
}
