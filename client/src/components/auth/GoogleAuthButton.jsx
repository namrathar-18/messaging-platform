import React, { useEffect, useRef, useState } from 'react';
import { Chrome, Loader2 } from 'lucide-react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({ label = 'Continue with Google', onCredential, onError }) {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;

    loadGoogleScript()
      .then(() => {
        if (!mounted) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) {
              onError?.('Google did not return a sign-in credential.');
              return;
            }
            setLoading(true);
            try {
              await onCredential(credential);
            } catch (err) {
              onError?.(err.response?.data?.error || 'Google sign-in failed. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        });
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: label.toLowerCase().includes('sign up') ? 'signup_with' : 'continue_with',
            width: Math.min(buttonRef.current.clientWidth || 360, 400),
          });
        }
      })
      .catch(() => onError?.('Could not load Google sign-in. Check your connection and try again.'));

    return () => {
      mounted = false;
    };
  }, [clientId, label, onCredential, onError]);

  if (clientId) {
    return (
      <div className="relative rounded-xl border border-white/45 bg-white/65 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
        <div ref={buttonRef} className="flex min-h-[40px] justify-center" />
        {loading && (
          <div className="absolute inset-1.5 grid place-items-center rounded-full bg-white/80 text-slate-800 backdrop-blur dark:bg-slate-950/80 dark:text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onError?.('Set VITE_GOOGLE_CLIENT_ID in the client and GOOGLE_CLIENT_ID in the server to enable Google sign-in.')}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/65 py-2.5 text-sm font-black text-slate-800 shadow-sm backdrop-blur hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
    >
      <Chrome className="h-4 w-4" />
      {label}
    </button>
  );
}
