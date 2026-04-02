'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Users, Map, Zap, CheckCircle2 } from 'lucide-react';

interface RoundDraft {
  id: string;
  name: string;
  qualifyPerGroup: number;
}

function generateId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function RoadmapPage() {
  const router = useRouter();
  const [totalTeams, setTotalTeams] = useState(48);
  const [teamsPerGroup, setTeamsPerGroup] = useState(12);
  const [tournamentName, setTournamentName] = useState('');
  const [rounds, setRounds] = useState<RoundDraft[]>([
    { id: 'round_1', name: 'Round 1', qualifyPerGroup: 9 },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saved, setSaved] = useState(false);

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  function addRound() {
    const newName = `Round ${rounds.length + 1}`;
    setRounds(prev => [...prev, { id: generateId(newName), name: newName, qualifyPerGroup: 6 }]);
  }

  function removeRound(idx: number) {
    setRounds(prev => prev.filter((_, i) => i !== idx));
  }

  function updateRound(idx: number, field: keyof RoundDraft, value: any) {
    setRounds(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      if (field === 'name') updated.id = generateId(value);
      return updated;
    }));
  }

  function moveRound(idx: number, dir: -1 | 1) {
    const newRounds = [...rounds];
    const target = idx + dir;
    if (target < 0 || target >= newRounds.length) return;
    [newRounds[idx], newRounds[target]] = [newRounds[target], newRounds[idx]];
    setRounds(newRounds);
  }

  // Live calculation of team flow
  const teamFlow = useCallback(() => {
    const groups0 = Math.ceil(totalTeams / teamsPerGroup);
    const flow: { roundName: string; teams: number; groups: number; qualifyTotal: number }[] = [];
    let currentTeams = totalTeams;

    for (let i = 0; i < rounds.length; i++) {
      const groups = Math.ceil(currentTeams / teamsPerGroup);
      const qualifyTotal = i < rounds.length - 1 ? groups * rounds[i].qualifyPerGroup : currentTeams;
      flow.push({
        roundName: rounds[i].name,
        teams: currentTeams,
        groups,
        qualifyTotal: Math.min(qualifyTotal, currentTeams),
      });
      currentTeams = Math.min(qualifyTotal, currentTeams);
    }
    return flow;
  }, [totalTeams, teamsPerGroup, rounds]);

  async function handleSave() {
    if (!tournamentName.trim()) return showMsg('Tournament name is required', 'error');
    if (rounds.length === 0) return showMsg('Add at least one round', 'error');

    const ids = rounds.map(r => r.id);
    if (new Set(ids).size !== ids.length) return showMsg('Round names must be unique', 'error');

    setLoading(true);
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentName,
          totalTeams,
          teamsPerGroup,
          rounds: rounds.map((r, idx) => ({ ...r, order: idx })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('✅ Roadmap saved! Now import teams via Registration.');
      setSaved(true);
      setTimeout(() => router.push('/admin'), 2000);
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const flow = teamFlow();

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100">
      {/* Header */}
      <header className="bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">
              Roadmap Builder
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              Define tournament structure before importing teams
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {message && (
          <div className={`mb-8 p-4 rounded-xl border text-[11px] font-black uppercase tracking-widest ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Config */}
          <div className="space-y-6">
            {/* Tournament Name */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <label className="block text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-3">
                Tournament Name
              </label>
              <input
                type="text"
                className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-[#ff6a00]/50 outline-none transition-colors"
                placeholder="e.g. Free Fire Championship 2026"
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
              />
            </div>

            {/* Team Settings */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <h3 className="text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-5">
                Team Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Total Teams
                  </label>
                  <input
                    type="number"
                    min={4}
                    className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-2xl focus:border-[#ff6a00]/50 outline-none"
                    value={totalTeams}
                    onChange={e => setTotalTeams(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Teams per Group
                  </label>
                  <input
                    type="number"
                    min={2}
                    className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-2xl focus:border-[#ff6a00]/50 outline-none"
                    value={teamsPerGroup}
                    onChange={e => setTeamsPerGroup(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Rounds */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.3em]">
                  Rounds
                </h3>
                <button
                  onClick={addRound}
                  className="flex items-center gap-1.5 text-[10px] font-black text-[#ff6a00] uppercase tracking-widest hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Round
                </button>
              </div>
              <div className="space-y-4">
                {rounds.map((round, idx) => (
                  <div key={idx} className="group bg-black/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest w-6 text-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        className="flex-1 bg-transparent border-b border-white/10 text-white font-black text-lg italic tracking-tight focus:border-[#ff6a00]/50 outline-none pb-1 uppercase"
                        value={round.name}
                        onChange={e => updateRound(idx, 'name', e.target.value)}
                      />
                      <div className="flex gap-1">
                        <button onClick={() => moveRound(idx, -1)} className="text-gray-600 hover:text-white p-1">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveRound(idx, 1)} className="text-gray-600 hover:text-white p-1">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {rounds.length > 1 && (
                          <button onClick={() => removeRound(idx)} className="text-gray-600 hover:text-red-400 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {idx < rounds.length - 1 ? (
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                          Top teams qualify per group:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={teamsPerGroup}
                          className="w-20 bg-black/50 border border-white/5 rounded-lg px-3 py-1.5 text-white font-black text-lg text-center focus:border-[#ff6a00]/50 outline-none"
                          value={round.qualifyPerGroup}
                          onChange={e => updateRound(idx, 'qualifyPerGroup', Number(e.target.value))}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Final Round — All remaining teams compete</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#ff6a00] hover:bg-[#ff7b1a] disabled:opacity-40 text-black font-black uppercase italic py-5 rounded-2xl transition-all text-lg shadow-[0_0_40px_rgba(255,106,0,0.2)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : saved ? (
                <><CheckCircle2 className="w-6 h-6" /> Roadmap Saved!</>
              ) : (
                <><Zap className="w-5 h-5 fill-black" /> Activate Roadmap</>
              )}
            </button>
          </div>

          {/* Right: Live Preview */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              Live Flow Preview
            </h3>
            <div className="space-y-3">
              {flow.map((stage, idx) => (
                <div key={idx} className="relative">
                  <div className={`bg-white/[0.03] border rounded-2xl p-5 ${idx === 0 ? 'border-[#ff6a00]/30' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-white uppercase italic tracking-tighter text-lg">{stage.roundName}</h4>
                      <span className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest">
                        {stage.groups} groups
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-black text-white">{stage.teams}</p>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Teams</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-white">{stage.groups}</p>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Groups</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-[#ff6a00]">
                          {idx < flow.length - 1 ? stage.qualifyTotal : stage.teams}
                        </p>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">
                          {idx < flow.length - 1 ? 'Advance' : 'Final'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {idx < flow.length - 1 && (
                    <div className="flex items-center justify-center my-1">
                      <ArrowRight className="w-4 h-4 text-[#ff6a00]/40 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #08080a; }
      `}</style>
    </div>
  );
}
