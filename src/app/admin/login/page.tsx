'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push('/admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-3xl">
            🛡️
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-1">Admin Access</h1>
        <p className="text-center text-gray-400 text-sm mb-8">Enter your admin secret key</p>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secret Key
            </label>
            <input
              id="admin-secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="input"
              placeholder="••••••••••••"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Access Admin Panel'
            )}
          </button>
        </form>

        <p className="text-center mt-6">
          <a href="/" className="text-gray-500 hover:text-accent text-sm transition-colors">
            ← Back to Team Login
          </a>
        </p>
      </div>
    </div>
  );
}
