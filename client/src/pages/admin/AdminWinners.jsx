import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { X, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

const AdminWinners = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Modal state
  const [selectedProof, setSelectedProof] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchWinners = async () => {
    try {
      const res = await adminService.getWinners();
      setWinners(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();
  }, []);

  const handleVerify = async (id, status) => {
    setActionLoading(id);
    try {
      await adminService.verifyWinner(id, status, adminNote);
      setSelectedProof(null);
      fetchWinners();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayout = async (id) => {
    if (!window.confirm('Mark this winner as PAID?')) return;
    setActionLoading(id);
    try {
      await adminService.processPayout(id);
      fetchWinners();
    } catch (err) {
      alert(err.response?.data?.message || 'Payout failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Winner Verification & Payouts</h1>
        <p className="text-slate-500 mt-1">Review proofs and manage payouts.</p>
      </div>

      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" /> Review Winner Proof</h3>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 bg-slate-100 flex justify-center max-h-96 overflow-auto">
              {selectedProof.winner_proofs?.[0]?.file_url ? (
                <img src={selectedProof.winner_proofs[0].file_url} alt="Proof" className="max-w-full rounded shadow" />
              ) : (
                <div className="py-12 text-slate-500">No proof image uploaded yet.</div>
              )}
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Admin Note (Optional)</label>
              <textarea 
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 mb-6"
                rows="2"
                placeholder="Reason for rejection or approval notes..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
              
              <div className="flex gap-4 justify-end">
                <button 
                  onClick={() => handleVerify(selectedProof.id, 'REJECTED')}
                  disabled={actionLoading === selectedProof.id}
                  className="px-6 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Reject Proof
                </button>
                <button 
                  onClick={() => handleVerify(selectedProof.id, 'APPROVED')}
                  disabled={actionLoading === selectedProof.id}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Winner</th>
                <th className="px-6 py-4">Draw / Match</th>
                <th className="px-6 py-4">Prize</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Payout Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></td>
                </tr>
              ) : winners.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No winners found.</td></tr>
              ) : (
                winners.map(winner => (
                  <tr key={winner.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{winner.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-slate-500 text-xs">{winner.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{new Date(winner.draws?.draw_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
                      <div className="text-indigo-600 font-medium text-xs bg-indigo-50 inline-block px-2 py-0.5 rounded-full mt-1">
                        {winner.match_type} Matches
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{winner.amount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                        winner.verification_status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                        winner.verification_status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {winner.verification_status}
                      </span>
                      {winner.winner_proofs?.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1 cursor-pointer flex items-center" onClick={() => { setAdminNote(''); setSelectedProof(winner); }}>
                          <ExternalLink className="w-3 h-3 mr-1" /> View Proof
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {winner.verification_status === 'APPROVED' ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          winner.payouts?.[0]?.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {winner.payouts?.[0]?.status || 'PENDING'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting Auth</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {winner.verification_status === 'PENDING' && winner.winner_proofs?.length > 0 && (
                         <button 
                          onClick={() => { setAdminNote(''); setSelectedProof(winner); }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                         >
                           Review
                         </button>
                      )}
                      {winner.verification_status === 'APPROVED' && winner.payouts?.[0]?.status !== 'PAID' && (
                        <button 
                          onClick={() => handlePayout(winner.id)}
                          disabled={actionLoading === winner.id}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                          <CreditCard className="w-3 h-3 mr-1" /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWinners;
