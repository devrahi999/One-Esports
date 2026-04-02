'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, Loader2, FileText } from 'lucide-react';

export default function RegistrationPage() {
  const router = useRouter();
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [teamsCount, setTeamsCount] = useState(0);
  const [hasRoadmap, setHasRoadmap] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  }

  useEffect(() => {
    fetch('/api/roadmap').then(r => r.json()).then(data => {
      if (data.tournament) {
        setTournamentId(data.tournament.id);
        setTeamsCount(data.tournament.teamIds?.length || 0);
        setHasRoadmap(data.roadmap?.length > 0);
      }
    });
  }, []);

  async function handleSync() {
    if (!csvData.trim()) return showMsg('Paste CSV data first', 'error');
    if (!tournamentId) return showMsg('No tournament found. Create a roadmap first.', 'error');
    if (!hasRoadmap) return showMsg('Create a roadmap before importing teams.', 'error');

    setLoading(true);
    try {
      const res = await fetch('/api/sync-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`✅ ${data.synced} teams synced into ${data.groupsCreated} groups for ${data.firstRoundId}!`);
      setCsvData('');
      setTeamsCount(prev => prev + data.synced);
      setTimeout(() => router.push('/admin'), 2000);
    } catch (e: any) {
      showMsg('❌ ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100">
      <header className="bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-white text-xl uppercase italic tracking-tighter leading-none">Registration</h1>
            <p className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-[0.2em] mt-0.5">
              {teamsCount > 0 ? `${teamsCount} teams already synced` : 'Import teams via CSV'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {!hasRoadmap && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-4">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="font-black text-amber-400 uppercase tracking-widest text-[11px]">Roadmap Required</p>
              <p className="text-amber-500/70 text-xs mt-1">You must create a tournament roadmap before importing teams.</p>
            </div>
            <Link href="/admin/roadmap" className="ml-auto bg-amber-500 hover:bg-amber-400 text-black font-black uppercase italic text-xs px-4 py-2 rounded-xl transition-all whitespace-nowrap">
              Create Roadmap
            </Link>
          </div>
        )}

        {message && (
          <div className={`mb-8 p-4 rounded-xl border text-[11px] font-black uppercase tracking-widest ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <UploadCloud className="w-6 h-6 text-[#ff6a00]" />
            <h2 className="font-black text-white uppercase italic tracking-tighter text-2xl">CSV Data Import</h2>
          </div>

          <div className="mb-6 bg-black/50 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#ff6a00]" />
              <p className="text-[10px] font-black text-[#ff6a00] uppercase tracking-widest">Expected CSV Format</p>
            </div>
            <p className="font-mono text-xs text-gray-400 leading-relaxed">
              Team Name, Team Tag, Team Leader Email, Team Leader WhatsApp Number, Leader UID, Leader IGN,<br/>
              Player2 UID, Player2 IGN, Player3 UID, Player3 IGN, Player4 UID, Player4 IGN, Player5 UID, Player5 IGN
            </p>
          </div>

          <textarea
            className="w-full bg-black/50 border border-white/5 rounded-2xl p-6 text-sm font-mono text-gray-300 focus:border-[#ff6a00]/30 outline-none transition-colors min-h-[350px] resize-y"
            placeholder="Paste your CSV data here (include header row)..."
            value={csvData}
            onChange={e => setCsvData(e.target.value)}
          />

          <button
            onClick={handleSync}
            disabled={loading || !hasRoadmap}
            className="w-full mt-6 flex items-center justify-center gap-3 bg-[#ff6a00] hover:bg-[#ff7b1a] disabled:opacity-30 text-black font-black uppercase italic py-5 rounded-2xl transition-all text-lg shadow-[0_0_40px_rgba(255,106,0,0.2)]"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><UploadCloud className="w-6 h-6" /> Sync Teams & Create Round 1 Groups</>}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #08080a; }
      `}</style>
    </div>
  );
}
