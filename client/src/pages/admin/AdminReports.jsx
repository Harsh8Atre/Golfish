import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { BarChart3, Users, IndianRupee, Trophy, Heart } from 'lucide-react';

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await adminService.getReports();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!data) return <div className="text-red-500">Failed to load reports</div>;

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex items-center">
        <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Platform performance and financial summaries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium flex items-center mb-2"><Trophy className="w-4 h-4 mr-2" /> Total Draws Published</div>
          <div className="text-3xl font-black text-slate-900">{data.drawsCount}</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium flex items-center mb-2"><Users className="w-4 h-4 mr-2" /> Total Winners</div>
          <div className="text-3xl font-black text-slate-900">{data.winnersCount}</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium flex items-center mb-2"><IndianRupee className="w-4 h-4 mr-2" /> Total Winnings Generated</div>
          <div className="text-3xl font-black text-slate-900">₹{data.totalWinnings.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium flex items-center mb-2"><CheckCircleIcon className="w-4 h-4 mr-2" /> Approved Winnings</div>
          <div className="text-3xl font-black text-green-600">₹{data.approvedWinnings.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center"><Heart className="w-5 h-5 mr-2 text-rose-500" /> Subscription Distribution</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">Monthly Plan</span>
                <span className="font-bold">{data.subscriptions.monthly}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(data.subscriptions.monthly / (data.subscriptions.monthly + data.subscriptions.yearly + data.subscriptions.inactive || 1)) * 100}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">Yearly Plan</span>
                <span className="font-bold">{data.subscriptions.yearly}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(data.subscriptions.yearly / (data.subscriptions.monthly + data.subscriptions.yearly + data.subscriptions.inactive || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-500">Inactive / Cancelled</span>
                <span className="font-bold text-slate-500">{data.subscriptions.inactive}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
             <IndianRupee className="w-10 h-10 text-indigo-600" />
           </div>
           <h3 className="font-bold text-slate-900 text-lg mb-2">Total Prize Pools Calculated</h3>
           <p className="text-4xl font-black text-slate-900">₹{data.totalPrizePools.toLocaleString()}</p>
           <p className="text-sm text-slate-500 mt-2">Sum of all generated pools historically.</p>
        </div>
      </div>
    </div>
  );
};

// Quick helper
const CheckCircleIcon = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default AdminReports;
