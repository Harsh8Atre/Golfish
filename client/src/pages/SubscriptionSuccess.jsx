import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionService } from '../services/subscriptionService';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const SubscriptionSuccess = () => {
  const [status, setStatus] = useState('checking'); // checking, active, wait

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await subscriptionService.getMe();
        if (data.subscription && (data.subscription.status === 'ACTIVE' || data.subscription.status === 'TRIALING')) {
          setStatus('active');
        } else {
          setStatus('wait');
        }
      } catch (_error) {
        setStatus('wait');
      }
    };
    
    // Check immediately
    checkStatus();
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
        {status === 'checking' && (
          <div className="py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Verifying Payment...</h2>
          </div>
        )}

        {status === 'wait' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Completed</h2>
            <p className="text-slate-600 mb-8">
              Your subscription is being confirmed by Stripe. This usually takes a few seconds.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors w-full"
            >
              Refresh Status
            </button>
          </div>
        )}

        {status === 'active' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Golfish!</h2>
            <p className="text-slate-600 mb-8">
              Your subscription is active. You can now start tracking your scores and participating in draws.
            </p>
            <Link 
              to="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors w-full"
            >
              Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
