'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Trophy, Users, Calendar, ChevronDown, ChevronUp,
  Archive, Medal, Swords, BarChart3, Crown
} from 'lucide-react';

interface PastTournament {
  id: string;
  name: string;
  archivedAt: string;
  totalRegistrations: number;
  champion: string | null;
  teamsPerGroup: number;
  roadmapSummary: { id: string; name: string; qualifyPerGroup: number; status: string }[];
  rounds: {
    roundId: string;
    roundName: string;
    groups: {
      groupId: string;
      name: string;
      teams: string[];
      standings: { rank: number; teamName: string; points: number; kills: number; matchesPlayed: number }[];
      qualifiedTeams: string[];
    }[];
  }[];
  finalStandings: { rank: number; teamName: string; points: number; kills: number }[];
  registeredTeams: { teamName: string; uid: string }[];
}

export default function PastTournamentsPage() {
  const [tournaments, setTournaments] = useState<PastTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PastTournament | null>(null);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tournament/past')
      .then(r => r.json())
      .then(data => {
        setTournaments(data.tournaments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff6a00]/20 border-t-[#ff6a00] rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-[#08080a] text-gray-100">
        <header className="bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">{selected.name}</h1>
              <p className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-[0.2em] mt-0.5">
                Archived • {new Date(selected.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-white">{selected.totalRegistrations}</p>
              <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Registered Teams</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-white">{selected.rounds.length}</p>
              <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Rounds</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-white">{selected.teamsPerGroup}</p>
              <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Teams / Group</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
              <Crown className="w-8 h-8 text-amber-400 mx-auto mb-1" />
              <p className="text-sm font-black text-amber-400 uppercase italic tracking-tight leading-tight">{selected.champion || 'N/A'}</p>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Champion</p>
            </div>
          </div>

          {/* Final Standings */}
          {selected.finalStandings.length > 0 && (
            <section>
              <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#ff6a00]" /> Final Standings
              </h2>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Team</th>
                      <th className="px-6 py-4 text-center text-[#ff6a00]">Points</th>
                      <th className="px-6 py-4 text-center">Kills</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selected.finalStandings.map((entry) => (
                      <tr key={entry.rank} className={`${entry.rank <= 3 ? 'bg-amber-500/5' : ''}`}>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${
                            entry.rank === 1 ? 'bg-amber-400 text-black' :
                            entry.rank === 2 ? 'bg-gray-400 text-black' :
                            entry.rank === 3 ? 'bg-amber-700 text-white' :
                            'text-gray-600'
                          }`}>{entry.rank}</span>
                        </td>
                        <td className="px-6 py-3 font-black text-white uppercase italic tracking-tight">
                          {entry.teamName}
                          {entry.rank === 1 && <Crown className="inline-block w-4 h-4 text-amber-400 ml-2" />}
                        </td>
                        <td className="px-6 py-3 text-center font-black text-white">{entry.points}</td>
                        <td className="px-6 py-3 text-center text-gray-400 font-mono">{entry.kills}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Round by Round Breakdown */}
          <section>
            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#ff6a00]" /> Round-by-Round Breakdown
            </h2>
            <div className="space-y-4">
              {selected.rounds.map((round) => (
                <div key={round.roundId} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedRound(expandedRound === round.roundId ? null : round.roundId)}
                  >
                    <div className="flex items-center gap-3">
                      <Swords className="w-4 h-4 text-[#ff6a00]" />
                      <span className="font-black text-white uppercase italic tracking-tight text-lg">{round.roundName}</span>
                      <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{round.groups.length} groups</span>
                    </div>
                    {expandedRound === round.roundId ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                  </button>
                  {expandedRound === round.roundId && (
                    <div className="px-6 pb-6 border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {round.groups.map((group) => (
                        <div key={group.groupId} className="bg-black/30 rounded-xl p-4">
                          <h4 className="font-black text-[#ff6a00] uppercase italic tracking-tight mb-3">{group.name}</h4>
                          <div className="space-y-1">
                            {group.standings.map((s) => (
                              <div key={s.rank} className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                                group.qualifiedTeams.includes(s.teamName) ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-500'
                              }`}>
                                <span className="font-black">#{s.rank} {s.teamName}</span>
                                <span className="font-mono">{s.points}pts · {s.kills}k</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-2">
                            ✓ {group.qualifiedTeams.length} advanced
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* All Registered Teams */}
          <section>
            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#ff6a00]" /> All Registered Teams ({selected.registeredTeams.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {selected.registeredTeams.map((team, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                  <p className="font-black text-white text-sm uppercase italic tracking-tight">{team.teamName}</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-0.5">{team.uid}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          body { font-family: 'Inter', sans-serif; background: #08080a; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100">
      <header className="bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">Past Tournaments</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">Archived tournament history</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {tournaments.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-white/10 rounded-3xl">
            <Archive className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h2 className="text-gray-500 font-black uppercase text-lg tracking-widest italic">No Archived Tournaments</h2>
            <p className="text-gray-700 font-bold text-sm mt-2 uppercase tracking-widest">
              Completed tournaments will appear here after archiving.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="text-left bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-[#ff6a00]/30 hover:bg-[#ff6a00]/[0.02] transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-white uppercase italic tracking-tighter text-xl group-hover:text-[#ff6a00] transition-colors">{t.name}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(t.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Medal className="w-8 h-8 text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-black text-white">{t.totalRegistrations}</p>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Teams</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{t.rounds.length}</p>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Rounds</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-400 uppercase italic tracking-tight leading-tight mt-1">{t.champion || '—'}</p>
                    <p className="text-[9px] text-amber-700 font-black uppercase tracking-widest">Champion</p>
                  </div>
                </div>
              </button>
            ))}
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
