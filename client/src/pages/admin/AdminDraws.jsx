import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Play, CheckCircle, AlertCircle, Info } from 'lucide-react';

const AdminDraws = () => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [simulation, setSimulation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('adminDrawSimulation');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (simulation) {
      sessionStorage.setItem(
        'adminDrawSimulation',
        JSON.stringify(simulation)
      );
    } else {
      sessionStorage.removeItem('adminDrawSimulation');
    }
  }, [simulation]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminService.simulateDraw(month);
      setSimulation(res.simulation);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to simulate draw.');
      setSimulation(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!simulation) {
      setError('You must simulate the draw first before publishing.');
      return;
    }
    if (!window.confirm(`Are you absolutely sure you want to PUBLISH the draw for ${month} with numbers ${simulation.numbers.join(', ')}? This is irreversible and will notify winners.`)) return;
    
    setLoading(true);
    setError('');
    try {
      await adminService.publishDraw(month, simulation.numbers);
      setSuccess(`Draw for ${month} published successfully!`);
      setSimulation(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish draw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Draw Management</h1>
        <p className="text-slate-500 mt-1">Simulate and publish the monthly subscription draw.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start text-sm border border-red-100">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center text-sm border border-green-100">
          <CheckCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Draw Controls</h2>
        <div className="flex flex-col sm:flex-row items-end gap-6">
          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-slate-700 mb-2">Draw Month (YYYY-MM)</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>
          
          <button 
            onClick={handleSimulate}
            disabled={loading || !month}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? 'Processing...' : <><Play className="w-4 h-4 mr-2" /> Simulate Draw</>}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-xl flex flex-start text-sm border border-blue-100">
          <Info className="w-5 h-5 mr-3 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold mb-1">How it works:</p>
            <p className="text-blue-700">The Base Prize Pool is automatically calculated based on the number of eligible active subscribers (users with 5 valid scores and an active/trialing subscription). You do not manually enter a prize pool amount.</p>
          </div>
        </div>
      </div>

      {simulation && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Simulation Results: {simulation.month}</h3>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">Dry Run</span>
          </div>
          
          <div className="p-6">
            <div className="mb-8 text-center">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Drawn Numbers</p>
              <div className="flex justify-center gap-3">
                {simulation.numbers.map((n, i) => (
                  <div key={i} className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md">{n}</div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 pt-8 border-t border-slate-100">
              <div>
                <p className="text-sm text-slate-500 mb-1">Eligible Participants</p>
                <p className="text-2xl font-bold text-slate-900">{simulation.participants}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Base Pool</p>
                <p className="text-2xl font-bold text-slate-900">₹{simulation.basePrizePool}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Jackpot Rollover Added</p>
                <p className="text-2xl font-bold text-indigo-600">+₹{simulation.rolloverApplied}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Effective Pool</p>
                <p className="text-2xl font-bold text-slate-900">₹{simulation.totalPrizePool}</p>
              </div>
            </div>

            <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Prize Tiers</h4>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">5 Matches (Jackpot / 40%)</span>
                  <span className="text-sm text-slate-500">{simulation.matches[5]} winners</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-indigo-600 block">₹{simulation.tiers.fiveMatch.pool}</span>
                  <span className="text-sm text-slate-500">₹{simulation.tiers.fiveMatch.payoutPerWinner} per winner</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">4 Matches (35%)</span>
                  <span className="text-sm text-slate-500">{simulation.matches[4]} winners</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">₹{simulation.tiers.fourMatch.pool}</span>
                  <span className="text-sm text-slate-500">₹{simulation.tiers.fourMatch.payoutPerWinner} per winner</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">3 Matches (25%)</span>
                  <span className="text-sm text-slate-500">{simulation.matches[3]} winners</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">₹{simulation.tiers.threeMatch.pool}</span>
                  <span className="text-sm text-slate-500">₹{simulation.tiers.threeMatch.payoutPerWinner} per winner</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button
                onClick={handlePublish}
                disabled={loading}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Publish Draw ({month})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDraws;
