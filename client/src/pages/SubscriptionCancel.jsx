import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

const SubscriptionCancel = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Checkout Cancelled</h2>
        <p className="text-slate-600 mb-8">
          You have cancelled the checkout process. No charges were made.
        </p>
        <div className="space-y-3">
          <Link 
            to="/subscribe"
            className="flex items-center justify-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors w-full"
          >
            Return to Subscription
          </Link>
          <Link 
            to="/"
            className="flex items-center justify-center px-6 py-3 bg-white text-slate-700 border border-slate-200 font-medium rounded-xl hover:bg-slate-50 transition-colors w-full"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
