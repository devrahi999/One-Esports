'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic tournament details
  const [tourName, setTourName] = useState('');
  const [tournamentActive, setTournamentActive] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/tournament')
      .then((res) => res.json())
      .then((data) => {
        if (data.tournament) {
          setTourName(data.tournament.name);
          setTournamentActive(true);
        } else {
          setTournamentActive(false);
        }
      })
      .catch(() => { setTournamentActive(false); });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid UID or Email');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');

        .page-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
          position: relative;
        }

        /* Background layers */
        .bg-image {
          position: absolute;
          inset: 0;
          background-image: url('/Background.jpeg');
          background-size: cover;
          background-position: center top;
          z-index: 0;
        }
        .bg-overlay-bottom {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.15) 0%,
            rgba(0,0,0,0.2) 40%,
            rgba(0,0,0,0.85) 70%,
            rgba(0,0,0,0.97) 100%
          );
          z-index: 1;
        }

        /* Animated particles */
        .particle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,165,0,0.6);
          animation: floatUp linear infinite;
          z-index: 2;
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-120vh) scale(0.2); opacity: 0; }
        }

        /* Hero content */
        .hero {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 420px;
          padding: 0 28px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          min-height: 100dvh;
          justify-content: center;
        }

        /* Main logo centered */
        .main-logo-top {
          max-width: 150px;
          display: block;
          margin: 0 auto 16px;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.8));
        }

        /* Dynamic Tournament Info (Above Buttons) */
        .dynamic-tour-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }
        .tour-name {
          font-family: 'Bebas Neue', cursive;
          font-size: 36px;
          line-height: 1.1;
          color: #FFB300;
          text-align: center;
          text-shadow: 0 0 20px rgba(255,140,0,0.6), 0 2px 4px rgba(0,0,0,0.8);
          letter-spacing: 2px;
          padding: 0 10px;
        }

        /* Buttons */
        .btn-login {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #FF8C00, #FFB300, #FF8C00);
          background-size: 200% 100%;
          border: none;
          border-radius: 6px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #1a0a00;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(255,140,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
          animation: shimmerBtn 3s ease infinite;
        }
        @keyframes shimmerBtn {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255,140,0,0.6);
        }
        .btn-login:active { transform: scale(0.98); }

        .btn-schedule {
          width: 100%;
          padding: 14px 24px;
          background: transparent;
          border: 1.5px solid rgba(255,179,0,0.4);
          border-radius: 6px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 3px;
          color: rgba(255,220,120,0.85);
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s;
          margin-top: 12px;
          backdrop-filter: blur(4px);
        }
        .btn-schedule:hover {
          border-color: rgba(255,179,0,0.8);
          background: rgba(255,140,0,0.1);
        }

        .footer-text {
          margin-top: 28px;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 2px;
          text-align: center;
          text-transform: uppercase;
        }
        .footer-text a {
          color: rgba(255,179,0,0.6);
          text-decoration: none;
        }
        .footer-text a:hover { color: #FFB300; }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal {
          background: linear-gradient(180deg, #1a140a 0%, #0f0c06 100%);
          border: 1px solid rgba(255,179,0,0.2);
          border-radius: 12px;
          padding: 32px 28px;
          width: 100%;
          max-width: 380px;
          position: relative;
          animation: slideUp 0.3s ease;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,140,0,0.1);
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.05);
          border: none;
          color: rgba(255,255,255,0.4);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .modal-close:hover {
          background: rgba(255,60,60,0.15);
          color: #ff6b6b;
        }
        .modal-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, rgba(255,140,0,0.15), rgba(255,179,0,0.05));
          border: 1px solid rgba(255,179,0,0.3);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
        }
        .modal-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .modal-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 24px;
        }

        .field-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          color: rgba(255,179,0,0.7);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,179,0,0.15);
          border-radius: 8px;
          padding: 12px 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          color: #fff;
          outline: none;
          transition: all 0.2s;
          margin-bottom: 16px;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .field-input:focus {
          border-color: rgba(255,179,0,0.5);
          background: rgba(255,179,0,0.04);
          box-shadow: 0 0 0 3px rgba(255,140,0,0.08);
        }

        .error-box {
          background: rgba(255,60,60,0.08);
          border: 1px solid rgba(255,60,60,0.25);
          border-radius: 8px;
          padding: 10px 14px;
          color: #ff8080;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .btn-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #FF8C00, #FFB300);
          border: none;
          border-radius: 8px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #1a0a00;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(255,140,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-submit:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(255,140,0,0.5);
          transform: translateY(-1px);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: rgba(0,0,0,0.8);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="page-root">
        {/* Background */}
        <div className="bg-image" />
        <div className="bg-overlay-bottom" />

        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${5 + (i * 8) % 90}%`,
              bottom: `${(i * 7) % 30}%`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              animationDuration: `${4 + (i % 5)}s`,
              animationDelay: `${(i * 0.6) % 4}s`,
              opacity: 0.4 + (i % 4) * 0.1,
            }}
          />
        ))}

        <div className="hero">
          {/* Logo centered */}
          <img src="/logo.png" alt="Free Fire Logo" className="main-logo-top" />

          {/* Tournament Status / Actions */}
          {tournamentActive === null ? (
            <div style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
              <div className="w-6 h-6 border-2 border-[#ff6a00] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-[10px] text-[#ff6a00] font-black uppercase tracking-[0.2em] animate-pulse">Checking status...</p>
            </div>
          ) : tournamentActive === false ? (
            <div style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}>
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                <p className="text-gray-400 font-bold text-sm mb-2">Notice</p>
                <h2 className="text-xl font-black text-white uppercase tracking-widest text-[#ff6a00]">No Tournaments Running</h2>
                <p className="text-xs text-gray-500 mt-2">Check back later for upcoming events</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tournament Name */}
              {tourName && (
                <div className="dynamic-tour-info">
                  <h1 className="tour-name">{tourName}</h1>
                </div>
              )}

              {/* Login Button */}
              <div style={{ width: '100%' }}>
                <button
                  id="team-login-btn"
                  className="btn-login"
                  onClick={() => setShowModal(true)}
                >
                  <span style={{ fontSize: '20px' }}>→</span>
                  Team Login
                </button>
              </div>
            </>
          )}

          <div className="footer-text" style={{ position: 'fixed', bottom: '20px', left: 0, right: 0 }}>
            Developed by{' '}
            <a
              href={`https://wa.me/8801336166870?text=${encodeURIComponent('I want this type of tournament management system')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Rahi Rahman
            </a>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal">
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="modal-icon">🎯</div>
            <div className="modal-title">Team Login</div>
            <div className="modal-sub">
              Enter your credentials to access your team dashboard
            </div>

            <form onSubmit={handleLogin}>
              <label className="field-label" htmlFor="uid-input">
                Player 1/Captain&apos;s UID
              </label>
              <input
                id="uid-input"
                type="text"
                className="field-input"
                placeholder="e.g., 123456789"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                required
                autoFocus
              />

              <label className="field-label" htmlFor="email-input">
                Contact Email
              </label>
              <input
                id="email-input"
                type="email"
                className="field-input"
                placeholder="player1@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <div className="error-box">⚠ {error}</div>}

              <button
                id="submit-login-btn"
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spin" />
                    Verifying...
                  </>
                ) : (
                  <>→ Login</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
