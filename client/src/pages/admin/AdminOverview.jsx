import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Users, CreditCard, Trophy, Heart, Clock, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await adminService.getOverview();
        setData(res.data);
      } catch (error) {
        console.error("Failed to load overview", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!data) return <div className="text-red-500">Failed to load data</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Platform snapshot and actionable metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={data.totalUsers} 
          icon={Users} 
          colorClass="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Active Subscribers" 
          value={data.activeSubscribers} 
          icon={CreditCard} 
          colorClass="bg-indigo-50 text-indigo-600" 
        />
        <StatCard 
          title="Current Prize Pool" 
          value={`₹${data.totalPrizePool.toLocaleString()}`} 
          icon={Trophy} 
          colorClass="bg-amber-50 text-amber-600" 
        />
        <StatCard 
          title="Projected Charity (Monthly)" 
          value={`₹${data.projectedMonthlyCharity.toLocaleString()}`} 
          icon={Heart} 
          colorClass="bg-rose-50 text-rose-600" 
        />
        <StatCard 
          title="Pending Verifications" 
          value={data.pendingVerifications} 
          icon={Clock} 
          colorClass="bg-orange-50 text-orange-600" 
        />
        <StatCard 
          title="Pending Payouts" 
          value={data.pendingPayouts} 
          icon={CheckCircle} 
          colorClass="bg-emerald-50 text-emerald-600" 
        />
      </div>
      
      {/* Could add a recent activity table here if requested, but cards suffice for 2-day MVP */}
    </div>
  );
};

export default AdminOverview;
