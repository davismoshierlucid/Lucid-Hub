import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function LoginPage() {
  const [params] = useSearchParams();
  const error = params.get('error');

  const errorMessage = useMemo(() => {
    if (!error) return null;
    const map = {
      cognito_not_configured:
        'Sign-in is not configured. Set Cognito environment variables on the API server.',
      missing_code: 'Login was cancelled or incomplete.',
      token_denied: 'Could not complete sign-in. Check Cognito callback URL settings.',
    };
    return map[error] || `Sign-in error: ${error}`;
  }, [error]);

  function signIn() {
    window.location.href = `${apiBase}/api/auth/login`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-10 shadow-xl shadow-black/40 backdrop-blur">
        <h1 className="text-center text-2xl font-semibold text-white">
          Lucid Hub
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Internal banker operating system — Lucid Capital Markets
        </p>

        {errorMessage && (
          <p className="mt-6 rounded-lg bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200 ring-1 ring-amber-500/30">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={signIn}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-[#2b4f8f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#234274] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <svg className="h-5 w-5" viewBox="0 0 23 23" aria-hidden="true">
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authentication uses AWS Cognito with your Microsoft 365 account.
        </p>
      </div>
    </div>
  );
}
