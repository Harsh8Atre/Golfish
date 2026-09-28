import React, { useState, useEffect } from 'react';
import { charityService } from '../services/charityService';
import { subscriptionService } from '../services/subscriptionService';
import { Check, Heart, AlertCircle, ArrowRight } from 'lucide-react';

const Subscribe = () => {
  const [charities, setCharities] = useState([]);
  const [plan, setPlan] = useState('monthly');
  const [selectedCharity, setSelectedCharity] = useState('');
  const [percentage, setPercentage] = useState(10);
  
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        const data = await charityService.getCharities();
        if (data.success && data.charities) {
          setCharities(data.charities);
          if (data.charities.length > 0) setSelectedCharity(data.charities[0].id);
        }
      } catch (_err) {
        setError('Failed to load charities. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchCharities();
  }, []);

  const handleCheckout = async () => {
    if (!selectedCharity) return setError('Please select a charity');
    if (percentage < 10 || percentage > 100) return setError('Percentage must be between 10 and 100');

    setError('');
    setCheckoutLoading(true);
    try {
      const res = await subscriptionService.checkout(plan, selectedCharity, percentage);
      if (res.url) {
        window.location.href = res.url; // Redirect to Stripe
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('You already have an active subscription.');
      } else {
        setError(err.response?.data?.message || 'Checkout failed. Please try again.');
      }
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Choose Your Membership</h1>
        <p className="text-lg text-slate-600">Play, track your scores, and support causes you care about.</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* LEFT COLUMN: Plan & Charity */}
        <div className="space-y-10">
          
          {/* Plan Selection */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">1</span>
              Select Plan
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPlan('monthly')}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${plan === 'monthly' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900">Monthly</h3>
                  {plan === 'monthly' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mb-1">₹499<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                <p className="text-sm text-slate-500">Flexible rolling monthly access.</p>
              </button>
              
              <button 
                onClick={() => setPlan('yearly')}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${plan === 'yearly' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900">Yearly</h3>
                  {plan === 'yearly' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mb-1">₹4,999<span className="text-sm text-slate-500 font-normal">/yr</span></p>
                <p className="text-sm text-green-600 font-medium">Save ~16% annually</p>
              </button>
            </div>
          </section>

          {/* Charity Selection */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">2</span>
              Choose Your Cause
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 pb-2">
              {charities.map(charity => (
                <button
                  key={charity.id}
                  onClick={() => setSelectedCharity(charity.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${selectedCharity === charity.id ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{charity.name}</h3>
                    <p className="text-sm text-slate-600 line-clamp-1">{charity.description}</p>
                  </div>
                  {selectedCharity === charity.id && <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />}
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Impact & Checkout */}
        <div>
          <div className="sticky top-24 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">3</span>
              Set Contribution
            </h2>
            
            <p className="text-sm text-slate-600 mb-6">
              Choose how much of your subscription goes toward your selected charity. (Minimum 10%)
            </p>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-medium text-slate-700">Allocation</label>
                <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>10% Min</span>
                <span>100% Max</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 mb-8 space-y-4">
              <div className="flex justify-between text-slate-600">
                <span>Plan</span>
                <span className="font-medium capitalize">{plan}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Charity</span>
                <span className="font-medium text-right max-w-[200px] truncate">{charities.find(c => c.id === selectedCharity)?.name || 'None'}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-lg pt-4 border-t border-slate-100">
                <span>Total due today</span>
                <span>{plan === 'monthly' ? '₹499' : '₹4,999'}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || !selectedCharity}
              className="w-full flex items-center justify-center px-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? 'Preparing Checkout...' : 'Continue to Payment'}
              {!checkoutLoading && <ArrowRight className="ml-2 w-5 h-5" />}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              You will be redirected securely to Stripe. Test mode only.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Subscribe;
