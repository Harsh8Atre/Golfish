import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { scoreService } from '../services/scoreService';
import api from '../services/api';
import { Plus, Edit2, Calendar, AlertCircle, TrendingUp, Trophy, Star, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { user, isSubscribed } = useAuth();
  const [scores, setScores] = useState([]);
  const [participation, setParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState({ id: null, score: '', playedAt: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Proof Upload
  const [proofFile, setProofFile] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofSuccess, setProofSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (isSubscribed) {
        try {
          const [scoreData, partData] = await Promise.all([
            scoreService.getScores(),
            api.get('/draws/my-participation')
          ]);
          setScores(scoreData.scores || []);
          setParticipation(partData.data?.participation);
        } catch (error) {
          console.error("Failed to fetch dashboard data", error);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [isSubscribed]);

  const handleEdit = (score) => {
    setFormState({ id: score.id, score: score.score, playedAt: score.playedAt });
    setFormError('');
    setShowForm(true);
  };

  const handleAddNew = () => {
    setFormState({ id: null, score: '', playedAt: '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (formState.id) {
        // Edit
        await scoreService.updateScore(formState.id, formState.score, formState.playedAt);
      } else {
        // Create
        await scoreService.createScore(formState.score, formState.playedAt);
      }
      
      // Refresh scores
      const data = await scoreService.getScores();
      setScores(data.scores || []);
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleProofUpload = async (e) => {
    e.preventDefault();
    if (!proofFile) {
      setProofError('Please select a file first.');
      return;
    }
    if (!participation?.winner?.id) return;
    
    setProofError('');
    setProofSuccess('');
    setProofLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      
      await api.post(`/winners/${participation.winner.id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setProofSuccess('Proof uploaded successfully! Awaiting admin verification.');
      
      const updatedParticipation = { ...participation };
      if (!updatedParticipation.winner.winner_proofs) updatedParticipation.winner.winner_proofs = [];
      updatedParticipation.winner.winner_proofs = [{ status: 'PENDING' }];
      setParticipation(updatedParticipation);
      setProofFile(null);
    } catch (err) {
      setProofError(err.response?.data?.message || 'Failed to upload proof.');
    } finally {
      setProofLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not Subscribed View
  if (!isSubscribed) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Dashboard</h1>
        <p className="text-slate-600 mb-8">Welcome back, {user?.full_name}!</p>
        
        <div className="p-12 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Join the Club</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Subscribe to Golfish to track your latest 5 Stableford scores, support charity, and enter the monthly draws.
          </p>
          <a href="/subscribe" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Choose Membership
          </a>
        </div>
      </div>
    );
  }

  // Today's date for max attribute
  const today = new Date().toISOString().split('T')[0];
  const isReplacingScore = !formState.id && scores.length >= 5;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user?.full_name}. Here is your current performance.</p>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" /> Latest 5 Scores
            </h2>
            <p className="text-sm text-slate-500 mt-1">These numbers are your ticket to the monthly draw.</p>
          </div>
          {!showForm && (
            <button 
              onClick={handleAddNew}
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Score
            </button>
          )}
        </div>

        {/* Form Modal/Inline */}
        {showForm && (
          <div className="px-8 py-8 border-b border-slate-100 bg-blue-50/30">
            <h3 className="font-bold text-slate-900 mb-6">{formState.id ? 'Edit Score' : 'Add New Score'}</h3>
            
            {isReplacingScore && (
              <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-lg flex items-start gap-3 text-sm border border-amber-100">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>You already have 5 scores. Adding this score will replace your oldest retained score.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="max-w-2xl">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stableford Score</label>
                  <input
                    type="number"
                    min="1"
                    max="45"
                    required
                    value={formState.score}
                    onChange={e => setFormState({...formState, score: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow"
                    placeholder="e.g. 36"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date Played</label>
                  <input
                    type="date"
                    max={today}
                    required
                    value={formState.playedAt}
                    onChange={e => setFormState({...formState, playedAt: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Score'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 text-slate-600 font-medium hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Score List */}
        <div className="p-8">
          {scores.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Your score history starts here.</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">
                Add your latest Stableford scores to keep your Golfish profile ready for upcoming draws.
              </p>
              {!showForm && (
                <button 
                  onClick={handleAddNew}
                  className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" /> Add your first score
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {scores.map((score, index) => (
                <div key={score.id} className="relative group bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(score)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Score"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Score {index + 1}</div>
                  <div className="text-5xl font-black text-slate-900 mb-4">{score.score}</div>
                  
                  <div className="flex items-center text-sm text-slate-600 bg-white inline-flex px-3 py-1.5 rounded-lg border border-slate-200">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    {new Date(score.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
              
              {/* Ghost slots for visual clarity that they need 5 */}
              {Array.from({ length: Math.max(0, 5 - scores.length) }).map((_, i) => (
                <div key={`ghost-${i}`} className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 border-dashed flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                  <span className="text-sm font-medium uppercase tracking-wider mb-2">Score {scores.length + i + 1}</span>
                  <span className="text-3xl font-light opacity-50">-</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>

      {/* Monthly Draw Section */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-indigo-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-indigo-600" /> Monthly Draw
          </h2>
          <p className="text-sm text-slate-500 mt-1">Your participation in the Golfish rewards pool.</p>
        </div>
        
        <div className="p-4 sm:p-8">
          {!participation?.draw ? (
            <p className="text-slate-500">No published draw yet. Check back soon!</p>
          ) : !participation.participated ? (
            <div className="p-4 bg-slate-50 rounded-xl text-slate-600">
              <p>You did not participate in the {new Date(participation.draw.draw_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} draw.</p>
              <p className="text-sm mt-1 text-slate-500">Make sure you have an active subscription and 5 scores logged before the next draw.</p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {new Date(participation.draw.draw_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} Results
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-lg">
                  <div>
                    <span className="block text-sm text-slate-500 mb-2">Winning Numbers</span>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {[participation.draw.number_1, participation.draw.number_2, participation.draw.number_3, participation.draw.number_4, participation.draw.number_5].map((n, i) => (
                        <span key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-base">{n}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm text-slate-500 mb-2">Your Entry</span>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {participation.entry ? participation.entry.map((n, i) => (
                        <span key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-sm sm:text-base">{n}</span>
                      )) : <span className="text-sm text-slate-400">Entry hidden</span>}
                    </div>
                  </div>
                </div>
              </div>

              {participation.winner ? (
                <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                  <h4 className="text-lg font-bold text-green-800 mb-2">Congratulations! 🎉</h4>
                  <p className="text-green-700">You matched <strong>{participation.winner.match_type}</strong> numbers.</p>
                  <p className="text-green-700 mt-2 font-medium">Prize Amount: ₹{participation.winner.amount}</p>
                  <p className="text-sm text-green-600 mt-2 mb-4">
                    Verification: <span className="font-semibold">{participation.winner.verification_status}</span>
                    {participation.winner.payouts?.[0] && ` | Payout: ${participation.winner.payouts[0].status}`}
                  </p>

                  {/* Proof Upload Section */}
                  {participation.winner.verification_status === 'PENDING' && (!participation.winner.winner_proofs || participation.winner.winner_proofs.length === 0) && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <p className="text-sm text-green-800 font-medium mb-3">Please upload a screenshot of your digital scorecard to claim your prize.</p>
                      
                      {proofError && (
                        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{proofError}</span>
                        </div>
                      )}
                      
                      {proofSuccess && (
                        <div className="mb-3 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>{proofSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleProofUpload} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => setProofFile(e.target.files[0])}
                          className="flex-1 px-3 py-2 border border-green-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          type="submit"
                          disabled={proofLoading || !proofFile}
                          className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                          {proofLoading ? 'Uploading...' : 'Upload Proof'}
                        </button>
                      </form>
                    </div>
                  )}
                  
                  {participation.winner.winner_proofs?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Proof uploaded. Status: {participation.winner.winner_proofs[0].status}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl">
                  <p className="text-slate-600">You matched {participation.matches} numbers.</p>
                  <p className="text-slate-500 mt-1">Keep playing and improving your scores for the next draw!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
