'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy, Map, Users, Swords, Key, BarChart3, Trash2,
  UserPlus, ChevronRight, ShieldCheck, LogOut, Zap,
  ArrowRight, CheckCircle2, Circle, Clock
} from 'lucide-react';

interface RoadmapRound {
  id: string;
  name: string;
  order: number;
  qualifyPerGroup: number;
  status: 'pending' | 'active' | 'completed';
  groupIds: string[];
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  totalTeams: number;
  teamsPerGroup: number;
  teamIds: string[];
  roadmap: RoadmapRound[];
  currentRoundIndex: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/roadmap')
      .then(r => r.json())
      .then(data => {
        if (data.tournament) setTournament(data.tournament);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const roadmap: RoadmapRound[] = tournament?.roadmap || [];
  const hasRoadmap = roadmap.length > 0;
  const teamsCount = tournament?.teamIds?.length || 0;

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100">
      {/* Header */}
      <header className="bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#ff6a00]" />
            </div>
            <div>
              <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">
                Admin Console
              </h1>
              {tournament && (
                <p className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-[0.2em] mt-0.5">
                  {tournament.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-t-[#ff6a00] border-white/10 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Status Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white">{teamsCount}</p>
                <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Enlisted</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white">{roadmap.length}</p>
                <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Rounds</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white">{tournament?.totalTeams || '—'}</p>
                <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Total Slots</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white capitalize">{tournament?.status || '—'}</p>
                <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Status</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/admin/roadmap"
                className="group relative overflow-hidden flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-[#ff6a00]/30 hover:bg-[#ff6a00]/[0.03] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center group-hover:bg-[#ff6a00]/20 transition-colors">
                    <Map className="w-6 h-6 text-[#ff6a00]" />
                  </div>
                  <div>
                    <h2 className="font-black text-white uppercase italic tracking-tighter text-xl">Roadmap</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">
                      {hasRoadmap ? `${roadmap.length} rounds configured` : 'Build tournament structure'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#ff6a00] group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/admin/registration"
                className="group relative overflow-hidden flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-[#ff6a00]/30 hover:bg-[#ff6a00]/[0.03] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center group-hover:bg-[#ff6a00]/20 transition-colors">
                    <UserPlus className="w-6 h-6 text-[#ff6a00]" />
                  </div>
                  <div>
                    <h2 className="font-black text-white uppercase italic tracking-tighter text-xl">Registration</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">
                      {teamsCount > 0 ? `${teamsCount} teams synced` : 'Import teams via CSV'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#ff6a00] group-hover:translate-x-1 transition-all" />
              </Link>
            </div>

            {/* Round Progression */}
            {hasRoadmap && (
              <div>
                <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-5">
                  Tournament Roadmap — Round Progression
                </h2>
                <div className="space-y-3">
                  {roadmap.map((round, idx) => {
                    const isActive = round.status === 'active';
                    const isDone = round.status === 'completed';
                    const isPending = round.status === 'pending';
                    const groupCount = round.groupIds?.length || 0;

                    return (
                      <Link
                        key={round.id}
                        href={isActive || isDone ? `/admin/round/${round.id}` : '#'}
                        className={`group flex items-center justify-between rounded-2xl p-5 border transition-all ${
                          isActive
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/30 cursor-pointer hover:bg-[#ff6a00]/10'
                            : isDone
                            ? 'bg-emerald-500/[0.04] border-emerald-500/20 cursor-pointer hover:bg-emerald-500/[0.08]'
                            : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isDone ? 'bg-emerald-500' : isActive ? 'bg-[#ff6a00]' : 'bg-white/5'
                          }`}>
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : isActive ? (
                              <Zap className="w-5 h-5 text-black fill-black" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-600" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-white uppercase italic tracking-tight text-lg leading-none">
                                {round.name}
                              </h3>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                                isDone ? 'bg-emerald-500/10 text-emerald-400' :
                                isActive ? 'bg-[#ff6a00]/10 text-[#ff6a00]' : 'bg-white/5 text-gray-500'
                              }`}>
                                {round.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                              <span>{groupCount} Groups</span>
                              <span>·</span>
                              <span>Top {round.qualifyPerGroup} per group qualify</span>
                              {idx < roadmap.length - 1 && (
                                <>
                                  <span>·</span>
                                  <span>→ {round.groupIds?.length * round.qualifyPerGroup || '?'} advance to {roadmap[idx + 1]?.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {(isActive || isDone) && (
                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#ff6a00] group-hover:translate-x-1 transition-all flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Roadmap CTA */}
            {!hasRoadmap && (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <Map className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <h3 className="font-black text-white uppercase italic text-2xl tracking-tighter mb-2">
                  No Roadmap Created
                </h3>
                <p className="text-gray-500 text-sm mb-8">
                  Build your tournament structure first before importing teams.
                </p>
                <Link
                  href="/admin/roadmap"
                  className="inline-flex items-center gap-2 bg-[#ff6a00] hover:bg-[#ff7b1a] text-black font-black uppercase italic py-3 px-8 rounded-xl transition-all shadow-[0_0_30px_rgba(255,106,0,0.2)]"
                >
                  Create Roadmap <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #08080a; }
      `}</style>
    </div>
  );
}
