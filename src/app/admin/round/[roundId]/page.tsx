'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import {
  ArrowLeft, Users, CheckCircle2, Clock, CircleDot, ChevronRight,
  Trophy, ArrowRight, ShieldCheck, Zap, Loader2, Archive
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  roundId: string;
  teamIds: string[];
  qualifyCount: number;
  status: string;
  matchCount: number;
  allResultsSubmitted: boolean;
}

interface RoundConfig {
  id: string;
  name: string;
  order: number;
  qualifyPerGroup: number;
  status: string;
  groupIds: string[];
}

interface Tournament {
  id: string;
  name: string;
  roadmap: RoundConfig[];
  teamsPerGroup: number;
}

export default function RoundPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = use(params);
  const router = useRouter();
  const [round, setRound] = useState<RoundConfig | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  async function loadData() {
    try {
      const res = await fetch(`/api/round/${roundId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRound(data.round);
      setGroups(data.groups);
      setTournament(data.tournament);
      setCanAdvance(data.canAdvance);
    } catch (e: any) {
      showMsg('Failed to load round data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [roundId]);

  async function handleAdvance() {
    if (!confirm(`Advance to next round? This will create new groups from qualified teams.`)) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/round/${roundId}/advance`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`✅ Advanced! ${data.qualifiedTeams} teams in ${data.groupsCreated} groups for ${data.nextRoundName}.`);
      setTimeout(() => router.push(`/admin/round/${data.nextRoundId}`), 2000);
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setAdvancing(false);
    }
  }

  async function handleArchive() {
    if (!confirm('⚠️ This will archive the tournament and WIPE all live data. Are you absolutely sure?')) return;
    setArchiving(true);
    try {
      const res = await fetch('/api/tournament/archive', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`✅ Tournament archived! Champion: ${data.champion || 'N/A'}. Redirecting...`);
      setTimeout(() => router.push('/admin'), 3000);
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setArchiving(false);
    }
  }

  const roadmap: RoundConfig[] = tournament?.roadmap || [];
  const currentRoundIdx = roadmap.findIndex(r => r.id === roundId);
  const nextRound = roadmap[currentRoundIdx + 1];
  const isLastRound = currentRoundIdx === roadmap.length - 1;

  const doneGroups = groups.filter(g => g.allResultsSubmitted).length;
  const totalGroups = groups.length;
  const progress = totalGroups > 0 ? Math.round((doneGroups / totalGroups) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff6a00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100">
      <header className="bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">
                {round?.name || 'Round'}
              </h1>
              <p className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-[0.2em] mt-0.5">
                {tournament?.name}
              </p>
            </div>
          </div>
          {/* Roadmap mini navigation */}
          <div className="hidden md:flex items-center gap-2">
            {roadmap.map((r, idx) => (
              <div key={r.id} className="flex items-center gap-2">
                <Link
                  href={r.status !== 'pending' ? `/admin/round/${r.id}` : '#'}
                  className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all ${
                    r.id === roundId ? 'bg-[#ff6a00] text-black' :
                    r.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {r.name}
                </Link>
                {idx < roadmap.length - 1 && <ChevronRight className="w-3 h-3 text-gray-700" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {message && (
          <div className={`mb-8 p-4 rounded-xl border text-[11px] font-black uppercase tracking-widest ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Round Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-white">{totalGroups}</p>
            <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Groups</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-white">
              {groups.reduce((sum, g) => sum + g.teamIds.length, 0)}
            </p>
            <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Teams</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-white">{round?.qualifyPerGroup}</p>
            <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Qualify / Group</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-white">{doneGroups}/{totalGroups}</p>
            <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest mt-1">Results Done</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Round Progress</span>
            <span className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest">{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ff9f1c] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
            <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-gray-500 font-black uppercase text-sm tracking-widest italic">
              No groups yet. Import teams first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/admin/round/${roundId}/${group.id}`}
                className="group bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-[#ff6a00]/30 hover:bg-[#ff6a00]/[0.03] transition-all"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      group.allResultsSubmitted ? 'bg-emerald-500' :
                      group.matchCount > 0 ? 'bg-[#ff6a00]/20' : 'bg-white/5'
                    }`}>
                      {group.allResultsSubmitted ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : group.matchCount > 0 ? (
                        <CircleDot className="w-5 h-5 text-[#ff6a00]" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-white uppercase italic tracking-tight text-xl leading-none">
                        {group.name}
                      </h3>
                      <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-gray-500">
                        {group.allResultsSubmitted ? 'Completed' : group.matchCount > 0 ? `${group.matchCount} matches created` : 'Pending setup'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#ff6a00] group-hover:translate-x-1 transition-all" />
                </div>

                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {group.teamIds.length} teams
                  </span>
                  {!isLastRound && (
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-[#ff6a00]/60" /> Top {group.qualifyCount} qualify
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Advance to Next Round */}
        {!isLastRound && (
          <div className={`rounded-3xl p-8 border ${canAdvance ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/30' : 'bg-white/[0.02] border-white/5'}`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className={`font-black uppercase italic tracking-tighter text-2xl ${canAdvance ? 'text-white' : 'text-gray-600'}`}>
                  Continue to {nextRound?.name || 'Next Round'}
                </h3>
                <p className={`text-sm font-bold mt-1 ${canAdvance ? 'text-gray-400' : 'text-gray-600'}`}>
                  {canAdvance
                    ? `All ${totalGroups} groups completed. Ready to advance ${groups.reduce((s, g) => s + Math.min(g.qualifyCount, g.teamIds.length), 0)} qualified teams.`
                    : `Complete all group results first. ${totalGroups - doneGroups} group(s) still pending.`}
                </p>
              </div>
              <button
                onClick={handleAdvance}
                disabled={!canAdvance || advancing}
                className="flex items-center gap-3 bg-[#ff6a00] hover:bg-[#ff7b1a] disabled:opacity-30 disabled:cursor-not-allowed text-black font-black uppercase italic py-4 px-8 rounded-xl transition-all whitespace-nowrap shadow-[0_0_30px_rgba(255,106,0,0.2)]"
              >
                {advancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Advance</>}
              </button>
            </div>
          </div>
        )}

        {isLastRound && doneGroups === totalGroups && totalGroups > 0 && (
          <div className="rounded-3xl p-8 bg-emerald-500/[0.06] border border-emerald-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-8 h-8 text-emerald-500" />
                  <h3 className="font-black text-white uppercase italic tracking-tighter text-2xl">Tournament Complete!</h3>
                </div>
                <p className="text-emerald-400 font-bold text-sm">
                  All {totalGroups} groups have finished. The final results are in.
                </p>
                <p className="text-gray-500 font-bold text-xs mt-2 max-w-md">
                  Archiving will save a full snapshot of this tournament (all rounds, results, standings) and clear the admin panel for a new event.
                </p>
              </div>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black uppercase italic py-4 px-8 rounded-xl transition-all whitespace-nowrap shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                {archiving
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><Archive className="w-5 h-5" /> Archive &amp; Close Tournament</>
                }
              </button>
            </div>
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
