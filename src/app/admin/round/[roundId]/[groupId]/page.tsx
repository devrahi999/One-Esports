'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import {
  ArrowLeft, Users, Trophy, Key, BarChart3, Loader2,
  CheckCircle2, ChevronDown, ChevronUp, Send
} from 'lucide-react';

interface Player { name: string; uid: string; }
interface Team { id: string; teamName: string; playerDetails: Player[]; }
interface Match {
  id: string; roundLabel: string; date: string; time: string;
  map: string; roomID: string; passcode: string; resultsSubmitted: boolean;
  results: { teamId: string; kills: number; position: number; totalPoints: number }[];
}
interface LeaderboardEntry {
  teamId: string; teamName: string; totalPoints: number; kills: number;
  matchesPlayed: number; qualified: boolean;
}
interface Group {
  id: string; name: string; roundId: string; roundName: string;
  teamIds: string[]; qualifyCount: number; status: string;
  date?: string; time?: string; map?: string; matchCount?: number;
  roomId?: string; passcode?: string; isResultPublished?: boolean;
}

const MAPS = ['Bermuda', 'Kalahari', 'Purgatory', 'Alpine', 'Nexterra'];

export default function GroupPage({ params }: { params: Promise<{ roundId: string; groupId: string }> }) {
  const { roundId, groupId } = use(params);
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'teams' | 'matches' | 'room' | 'results' | 'standings'>('teams');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Match Details Form
  const [matchDetails, setMatchDetails] = useState({
    date: '', time: '', map: '', matchCount: 1
  });

  // Room ID form
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [roomID, setRoomID] = useState('');
  const [passcode, setPasscode] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  // Results form
  const [resultMatchId, setResultMatchId] = useState('');
  const [resultRows, setResultRows] = useState<{ teamId: string; teamName: string; kills: number; position: number }[]>([]);

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroup(data.group);
      setTeams(data.teams);
      setMatches(data.matches);
      setLeaderboard(data.leaderboard);
      if (data.group) {
        setMatchDetails({
          date: data.group.date || '',
          time: data.group.time || '',
          map: data.group.map || '',
          matchCount: data.group.matchCount || 1,
        });
        setRoomID(data.group.roomId || '');
        setPasscode(data.group.passcode || '');
      }
    } catch (e: any) {
      showMsg(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [groupId]);

  // When result match selected, pre-fill rows
  useEffect(() => {
    if (!resultMatchId) return;
    setResultRows(teams.map((t, i) => ({
      teamId: t.id,
      teamName: t.teamName,
      kills: 0,
      position: i + 1,
    })));
  }, [resultMatchId, teams]);

  async function handleUpdateMatchDetails() {
    if (!matchDetails.date || !matchDetails.time || !matchDetails.matchCount) return showMsg('All match details fields are required', 'error');
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: matchDetails.date,
          time: matchDetails.time,
          map: matchDetails.map,
          matchCount: Number(matchDetails.matchCount),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showMsg('✅ Match details updated! Placeholders created.');
      await loadData();
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSetRoom() {
    if (!roomID || !passcode) return showMsg('Room ID and Passcode required', 'error');
    setActionLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomID, passcode }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showMsg('✅ Room credentials published! Players can see them instantly.');
      await loadData();
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmitResults() {
    if (!resultMatchId) return showMsg('Select a match', 'error');
    setActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${resultMatchId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultRows }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showMsg('✅ Results submitted! Leaderboard updated.');
      setResultMatchId(''); setResultRows([]);
      await loadData();
      setTab('standings');
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const TABS = [
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'matches', label: 'Matches', icon: BarChart3 },
    { id: 'room', label: 'Room ID', icon: Key },
    { id: 'results', label: 'Results', icon: Send },
    { id: 'standings', label: 'Standings', icon: Trophy },
  ] as const;

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
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href={`/admin/round/${roundId}`} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">
              {group?.name} — {group?.roundName}
            </h1>
            <p className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-[0.2em] mt-0.5">
              {teams.length} teams · Top {group?.qualifyCount} qualify
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl border text-[11px] font-black uppercase tracking-widest ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t.id ? 'bg-[#ff6a00] text-black shadow-lg shadow-[#ff6a00]/20' : 'text-gray-500 hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* TEAMS TAB */}
        {tab === 'teams' && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                {teams.length} Teams in {group?.name}
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {teams.map((team, idx) => (
                <div key={team.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-gray-600 w-6 text-center">{idx + 1}</span>
                    <div>
                      <p className="font-black text-white uppercase italic tracking-tight">{team.teamName}</p>
                      <p className="text-[10px] text-gray-600 font-mono mt-0.5">{team.id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                    {team.playerDetails?.length || 0} players
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATCHES TAB */}
        {tab === 'matches' && (
          <div className="space-y-6">
            {/* Update match details */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <h3 className="text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-5">Update Match Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Number of Matches</label>
                  <input
                    type="number" min={1} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-[#ff6a00]/50 outline-none"
                    value={matchDetails.matchCount}
                    onChange={e => setMatchDetails(p => ({ ...p, matchCount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Maps</label>
                  <input
                    type="text" placeholder="E.g. Bermuda, Purgatory" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-[#ff6a00]/50 outline-none"
                    value={matchDetails.map}
                    onChange={e => setMatchDetails(p => ({ ...p, map: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Date</label>
                  <input type="date" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-[#ff6a00]/50 outline-none"
                    value={matchDetails.date} onChange={e => setMatchDetails(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Time</label>
                  <input type="time" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-[#ff6a00]/50 outline-none"
                    value={matchDetails.time} onChange={e => setMatchDetails(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <button
                onClick={handleUpdateMatchDetails}
                disabled={actionLoading}
                className="w-full bg-[#ff6a00] hover:bg-[#ff7b1a] disabled:opacity-40 text-black font-black uppercase italic py-4 rounded-xl transition-all"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Apply Match Details'}
              </button>
            </div>

            {/* Existing matches */}
            {matches.length > 0 && (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-black text-white uppercase italic tracking-tight">{m.roundLabel}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        {m.date} · {m.time} · {m.map}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {m.roomID && <span className="text-[9px] bg-[#ff6a00]/20 text-[#ff6a00] px-2 py-0.5 rounded font-black uppercase tracking-widest">Room: {m.roomID}</span>}
                      {m.resultsSubmitted && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">Results Done</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ROOM ID TAB */}
        {tab === 'room' && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-5">Publish Room Credentials</h3>
            <p className="text-gray-500 text-xs mb-6">Players will see this <strong className="text-white">instantly</strong> on their dashboards the moment you publish.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Room ID</label>
                  <input
                    type="text" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-black text-2xl tracking-widest focus:border-[#ff6a00]/50 outline-none"
                    placeholder="000000" value={roomID} onChange={e => setRoomID(e.target.value)} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Passcode</label>
                  <input
                    type="text" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-black text-2xl tracking-widest focus:border-[#ff6a00]/50 outline-none"
                    placeholder="••••••" value={passcode} onChange={e => setPasscode(e.target.value)} />
                </div>
              </div>
              <button
                onClick={handleSetRoom}
                disabled={actionLoading}
                className="w-full bg-[#ff6a00] hover:bg-[#ff7b1a] disabled:opacity-40 text-black font-black uppercase italic py-4 rounded-xl transition-all"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '🔑 Publish Now — Players See Instantly'}
              </button>
            </div>
          </div>
        )}

        {/* RESULTS TAB */}
        {tab === 'results' && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.3em] mb-5">Submit Match Results</h3>
            <div className="mb-5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Select Match</label>
              <select
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-[#ff6a00]/50 outline-none"
                value={resultMatchId}
                onChange={e => setResultMatchId(e.target.value)}
              >
                <option value="">— Select Match —</option>
                {matches.filter(m => !m.resultsSubmitted).map(m => (
                  <option key={m.id} value={m.id}>{m.roundLabel}</option>
                ))}
              </select>
            </div>

            {resultRows.length > 0 && (
              <>
                <div className="space-y-3 mb-5">
                  <div className="grid grid-cols-4 gap-2 text-[9px] font-black text-gray-600 uppercase tracking-widest px-2">
                    <span>Team</span><span className="text-center">Position</span><span className="text-center">Kills</span><span className="text-center">Points</span>
                  </div>
                  {resultRows.map((row, idx) => {
                    const posPoints = Math.max(0, 15 - (row.position - 1));
                    const total = posPoints + row.kills;
                    return (
                      <div key={row.teamId} className="grid grid-cols-4 gap-2 items-center bg-black/30 border border-white/5 rounded-xl p-3">
                        <span className="text-white font-black text-xs uppercase italic tracking-tight truncate">{row.teamName}</span>
                        <input
                          type="number" min={1} max={teams.length}
                          className="bg-black/50 border border-white/5 rounded-lg px-2 py-1.5 text-white font-black text-sm text-center focus:border-[#ff6a00]/50 outline-none"
                          value={row.position}
                          onChange={e => setResultRows(prev => prev.map((r, i) => i === idx ? { ...r, position: Number(e.target.value) } : r))}
                        />
                        <input
                          type="number" min={0}
                          className="bg-black/50 border border-white/5 rounded-lg px-2 py-1.5 text-white font-black text-sm text-center focus:border-[#ff6a00]/50 outline-none"
                          value={row.kills}
                          onChange={e => setResultRows(prev => prev.map((r, i) => i === idx ? { ...r, kills: Number(e.target.value) } : r))}
                        />
                        <span className="text-[#ff6a00] font-black text-sm text-center">{total}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-4">Points = Position Points + Kills</p>
                <button
                  onClick={handleSubmitResults}
                  disabled={actionLoading}
                  className="w-full bg-[#ff6a00] hover:bg-[#ff7b1a] disabled:opacity-40 text-black font-black uppercase italic py-4 rounded-xl transition-all"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '✅ Submit Results'}
                </button>
              </>
            )}

            <div className="mt-8 pt-8 border-t border-white/5">
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3">Publish Final Standings</h4>
              <p className="text-xs text-gray-500 mb-4">Clicking this will make the overall results and standings visible to the players on their dashboard.</p>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const res = await fetch(`/api/groups/${groupId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isResultPublished: true }),
                    });
                    if (!res.ok) throw new Error('Failed to publish');
                    showMsg('✅ Overall Results Published!');
                    await loadData();
                  } catch (e: any) {
                    showMsg('❌ ' + e.message, 'error');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading || group?.isResultPublished}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-black uppercase italic py-4 rounded-xl transition-all"
              >
                {group?.isResultPublished ? 'Standings Already Published' : '📢 Publish Overall Result'}
              </button>
            </div>
          </div>
        )}

        {/* STANDINGS TAB */}
        {tab === 'standings' && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Group Standings</h3>
              <span className="text-[9px] font-black text-[#ff6a00] uppercase tracking-widest">Top {group?.qualifyCount} qualify</span>
            </div>
            {leaderboard.length === 0 ? (
              <div className="py-16 text-center text-gray-600 font-black text-xs uppercase tracking-widest italic">
                Submit match results to see standings
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-left">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Team</th>
                    <th className="px-6 py-4 text-center">Points</th>
                    <th className="px-6 py-4 text-center">Kills</th>
                    <th className="px-6 py-4 text-center">Matches</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.teamId} className={`${entry.qualified ? 'bg-emerald-500/[0.04]' : ''} hover:bg-white/[0.01]`}>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-[10px] ${
                          i === 0 ? 'bg-[#ff6a00] text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-800 text-white' : 'text-gray-600'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-6 py-4 font-black text-white uppercase italic tracking-tight">{entry.teamName}</td>
                      <td className="px-6 py-4 text-center font-black text-white">{entry.totalPoints}</td>
                      <td className="px-6 py-4 text-center text-gray-400 font-mono">{entry.kills}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{entry.matchesPlayed}</td>
                      <td className="px-6 py-4 text-center">
                        {entry.qualified ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">Qualified</span>
                        ) : (
                          <span className="text-[9px] bg-white/5 text-gray-600 px-2 py-0.5 rounded font-black uppercase tracking-widest">Eliminated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
