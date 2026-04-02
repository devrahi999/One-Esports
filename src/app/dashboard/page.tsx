'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebaseClient';
import { 
  Trophy, 
  Users, 
  Swords, 
  Calendar, 
  Clock, 
  MapPin, 
  LogOut, 
  Key, 
  Hash, 
  History, 
  Gamepad2, 
  LayoutDashboard,
  ShieldAlert,
  Zap
} from 'lucide-react';

interface Player {
  name: string;
  uid: string;
}

interface MatchResult {
  teamId: string;
  kills: number;
  position: number;
  totalPoints: number;
}

interface Match {
  id: string;
  round: number;
  roundLabel: string;
  date: string;
  time: string;
  map: string;
  roomID: string;
  passcode: string;
  resultsSubmitted: boolean;
  results: MatchResult[];
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  kills: number;
  matchesPlayed: number;
  qualified: boolean;
}

interface DashboardData {
  team: { id: string; teamName: string; uid: string; playerDetails: Player[] };
  group: { id: string; name: string; teamIds: string[]; date?: string; time?: string; map?: string; matchCount?: number; roomId?: string; passcode?: string; isResultPublished?: boolean; qualifyCount?: number; } | null;
  groupTeams: { id: string; teamName: string; uid: string; playerDetails: Player[] }[];
  matches: Match[];
  leaderboard: LeaderboardEntry[];
  currentRound: string | null;
  currentRoundName: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Live room state from Firestore real-time listener on group
  const [liveGroupRoom, setLiveGroupRoom] = useState<{ roomID: string; passcode: string } | null>(null);
  const [newRoomFlash, setNewRoomFlash] = useState<boolean>(false);
  const prevRoomRef = useRef<string>('');
  const unsubRef = useRef<(() => void) | null>(null);

  // Initial data fetch
  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => {
        if (res.status === 401) {
          router.push('/');
          return null;
        }
        return res.json().then(data => ({ ok: res.ok, data }));
      })
      .then((result) => {
        if (!result) return;
        if (!result.ok || result.data.error) {
          setError(result.data.error || 'Failed to load dashboard');
        } else {
          setData(result.data);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error('Fetch error:', e);
        setError('Failed to load dashboard');
        setLoading(false);
      });
  }, [router]);

  // Firebase real-time listener for group details (Room ID)

  useEffect(() => {
    if (!data?.group?.id) return;
    const groupId = data.group.id;

    const unsub = onSnapshot(doc(firebaseDb, 'groups', groupId), (snapshot: any) => {
      if (!snapshot.exists()) return;
      const groupData = snapshot.data();
      
      const newRoom = groupData.roomId || '';
      const newPass = groupData.passcode || '';
      
      setLiveGroupRoom({ roomID: newRoom, passcode: newPass });

      // Detect new room ID (subtle flash animation)
      if (newRoom && newRoom !== prevRoomRef.current) {
        setNewRoomFlash(true);
        setTimeout(() => setNewRoomFlash(false), 8000); 
      }
      prevRoomRef.current = newRoom;
    }, (err: any) => {
      console.error("Firestore listener error:", err);
    });

    unsubRef.current = unsub;
    return () => unsub();
  }, [data?.group?.id]);

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080a]">
        <div className="text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-2 border-[#ff6a00]/10 rounded-full" />
            <div className="absolute inset-0 border-2 border-t-[#ff6a00] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#ff6a00] animate-pulse" />
            </div>
          </div>
          <p className="text-gray-500 font-bold tracking-[0.3em] uppercase text-[10px]">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080a] p-6">
        <div className="bg-[#111] border border-red-500/20 p-8 rounded-2xl max-w-sm w-full text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-bold uppercase text-xs tracking-widest mb-6 leading-relaxed">
            {error || 'Critical Error: Session Expired'}
          </p>
          <button onClick={() => router.push('/')} className="bg-white/5 hover:bg-white/10 text-white w-full py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all">
            Return to HQ
          </button>
        </div>
      </div>
    );
  }

  const upcomingMatches = data.matches.filter((m) => !m.resultsSubmitted);
  const completedMatches = data.matches.filter((m) => m.resultsSubmitted);
  const nextMatch = upcomingMatches[0];

  const isQualified = data.leaderboard.some(
    (l) => l.teamId === data.team.id && l.qualified
  );

  const liveRoomID = liveGroupRoom?.roomID || data.group?.roomId;
  const livePasscode = liveGroupRoom?.passcode || data.group?.passcode;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-200 selection:bg-[#ff6a00]/30 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Background: Fire Particles */}
      <div className="fire-background">
        {[...Array(25)].map((_, i) => (
          <div key={i} className="ember" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
          }} />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 relative z-10">
        
        {/* Header - Compact */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#ff6a00] text-[10px] font-black uppercase tracking-[0.3em]">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Operational Core
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              {data.team.teamName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-1">
              <span className="font-mono">{data.team.uid}</span>
              {data.currentRoundName && (
                <>
                  <span className="w-1 h-1 bg-white/10 rounded-full" />
                  <span className="text-[#ff6a00]/80 flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-[#ff6a00]" />
                    {data.currentRoundName}
                  </span>
                </>
              )}
              {data.group && (
                <>
                  <span className="w-1 h-1 bg-white/10 rounded-full" />
                  <span className="text-white/40">{data.group.name}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </header>

        {/* Global Qualification Banner - Simplified */}
        {isQualified && (
          <div className="mb-10 overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Mission Accomplished</h2>
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Confirmed Qualification to next stage</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Console Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* MATCH DETAILS AND ROOM CARD */}
            {data.group && (
            <section>
              <div
                className={`relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-6 md:p-8 transition-all duration-700 ${
                  newRoomFlash ? 'ring-1 ring-[#ff6a00] bg-[#ff6a00]/[0.03]' : ''
                }`}
              >
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter mb-5">Match Details</h3>

                {/* Plain bold text details */}
                <div className="space-y-2 mb-6">
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-black">📅 Date:</span>{' '}
                    <span className="text-white font-bold">
                      {data.group?.date ? new Date(data.group.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'}
                    </span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-black">🕐 Time:</span>{' '}
                    <span className="text-white font-bold">{data.group?.time || 'TBD'}</span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-black">🗺️ Maps:</span>{' '}
                    <span className="text-white font-bold">{data.group?.map || 'TBD'}</span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-black">🎮 Total Matches:</span>{' '}
                    <span className="text-white font-bold">{data.group?.matchCount ?? '?'}</span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-black">🏆 Top Qualify:</span>{' '}
                    <span className="text-white font-bold">Top {data.group?.qualifyCount ?? 3} teams advance</span>
                  </p>
                </div>

                {/* Room Credentials */}
                <div className="border-t border-white/5 pt-5">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">Room Credentials</p>
                  {liveRoomID && livePasscode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-1 opacity-60">Room ID</p>
                          <p className="text-xl font-black text-white font-mono tracking-widest">{liveRoomID}</p>
                        </div>
                        <button onClick={() => copyToClipboard(liveRoomID)} className="bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">Copy</button>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-1 opacity-60">Passcode</p>
                          <p className="text-xl font-black text-white font-mono tracking-widest">{livePasscode}</p>
                        </div>
                        <button onClick={() => copyToClipboard(livePasscode)} className="bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">Copy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-4">
                      <Clock className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <p className="text-gray-500 font-bold text-sm">Room ID &amp; Pass will be shared <span className="text-white font-black">10 minutes before</span> match start.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* STANDINGS */}
            {data.group?.isResultPublished && data.leaderboard.length > 0 && (
              <section>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                      <Trophy className="w-3.5 h-3.5 text-[#ff6a00]" /> Ranking Status
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-left text-gray-600 uppercase text-[9px] font-black tracking-widest">
                          <th className="px-6 py-4">#</th>
                          <th className="px-6 py-4">Squad Hub</th>
                          <th className="px-6 py-4 text-center text-[#ff6a00]">Points</th>
                          <th className="px-6 py-4 text-center">🏆</th>
                          <th className="px-6 py-4 text-center">K</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.leaderboard.slice(0, 12).map((entry, i) => (
                          <tr key={entry.teamId} className={`group hover:bg-white/[0.01] transition-colors ${entry.teamId === data.team.id ? 'bg-[#ff6a00]/5' : ''}`}>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-[10px] ${
                                i === 0 ? 'bg-[#ff6a00] text-black shadow-[0_0_15px_rgba(255,106,0,0.3)]' : 
                                i === 1 ? 'bg-gray-400 text-black' : 
                                i === 2 ? 'bg-amber-800 text-white' : 
                                'text-gray-600'
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-black uppercase italic tracking-tight">
                              <div className="flex items-center gap-2">
                                <span className={entry.teamId === data.team.id ? 'text-[#ff6a00]' : 'text-gray-300'}>{entry.teamName}</span>
                                {entry.teamId === data.team.id && <span className="text-[8px] bg-[#ff6a00] text-black px-1 rounded uppercase font-black tracking-tighter">Me</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-black text-white">{entry.totalPoints}</td>
                            <td className="px-6 py-4 text-center font-black text-amber-400 text-[11px]">
                              {(entry as any).booyahs > 0 ? `${(entry as any).booyahs}` : <span className="text-gray-700">—</span>}
                            </td>
                            <td className="px-6 py-4 text-center text-gray-500 font-mono">{entry.kills}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Side Info Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* SQUAD LIST */}
            <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">
                <Users className="w-4 h-4 text-[#ff6a00]" /> Roster
              </h3>
              <div className="space-y-3">
                {data.team.playerDetails.map((player, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-[#ff6a00] text-[10px] font-black">{String(i+1).padStart(2, '0')}</span>
                      <span className="text-xs font-black text-white uppercase tracking-tight">{player.name}</span>
                    </div>
                    {i === 0 && <ShieldAlert className="w-3.5 h-3.5 text-white/20" />}
                  </div>
                ))}
              </div>
            </section>

            {/* COMPETITORS - NAME ONLY */}
            {data.group && data.groupTeams.length > 0 && (
              <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">
                  <Swords className="w-4 h-4 text-[#ff6a00]" /> Group Pool
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {data.groupTeams.map((team, idx) => (
                    <div key={team.id} className={`p-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight italic flex justify-between items-center ${
                      team.id === data.team.id ? 'bg-[#ff6a00]/10 border border-[#ff6a00]/20 text-[#ff6a00]' : 'bg-white/5 text-gray-400'
                    }`}>
                       <span>{team.teamName}</span>
                       <span className="text-[8px] text-gray-700 font-mono">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* HISTORY MINI */}
            {completedMatches.length > 0 && (
              <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">
                  <History className="w-4 h-4 text-[#ff6a00]" /> Log
                </h3>
                <div className="space-y-3">
                  {completedMatches.slice(0, 3).map((match) => {
                    const myResult = match.results.find((r) => r.teamId === data.team.id);
                    return (
                      <div key={match.id} className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-[9px] font-black text-[#ff6a00] uppercase tracking-widest underline underline-offset-4">{match.roundLabel}</p>
                          <span className="text-white font-black text-lg italic tracking-tighter">#{myResult?.position || '-'}</span>
                        </div>
                        <div className="flex gap-4">
                           <div className="flex flex-col">
                              <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Kills</span>
                              <span className="text-xs font-black text-white tracking-widest">{myResult?.kills || 0}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Points</span>
                              <span className="text-xs font-black text-white tracking-widest">{myResult?.totalPoints || 0}</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Global Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 flex justify-between items-center text-gray-700 text-[9px] font-black uppercase tracking-[0.3em]">
           <div className="flex items-center gap-4">
             <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-[#ff6a00] fill-[#ff6a00]" /> Core Online</span>
             <span>One Esports System</span>
           </div>
           <div>© 2026 Operations Group</div>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          background-color: #08080a;
        }

        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Fire Particle System */
        .fire-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }
        .ember {
          position: absolute;
          bottom: -10px;
          background: #ff6a00;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1px);
          animation: rise linear infinite;
        }
        @keyframes rise {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-110vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
