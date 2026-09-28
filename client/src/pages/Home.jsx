import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Heart, Trophy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated, isSubscribed } = useAuth();
  
  let ctaLink = '/register';
  let ctaText = 'Join Golfish';
  
  if (isAuthenticated) {
    if (isSubscribed) {
      ctaLink = '/dashboard';
      ctaText = 'Go to Dashboard';
    } else {
      ctaLink = '/subscribe';
      ctaText = 'Choose Membership';
    }
  }

  return (
    <div className="w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
        {/* Background Gradients (Aurora Effect) */}
        <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl opacity-70 mix-blend-multiply"></div>
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-indigo-100/50 blur-3xl opacity-70 mix-blend-multiply"></div>
          <div className="absolute -bottom-20 left-1/2 w-80 h-80 rounded-full bg-rose-50/50 blur-3xl opacity-70 mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100/50">
            <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
            A new way to play
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
            Play with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">purpose.</span>
          </h1>
          
          <p className="mt-4 text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Track your performance, support causes you care about, and take part in monthly rewards.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={ctaLink} className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              {ctaText}
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-slate-700 font-medium rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION */}
      <section className="py-20 bg-white border-y border-slate-100" id="how-it-works">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="group text-center">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Play</h3>
              <p className="text-slate-600 leading-relaxed">
                Keep your latest five Stableford scores updated. Track your ongoing performance on the course.
              </p>
            </div>
            <div className="group text-center">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-6 group-hover:scale-110 group-hover:bg-rose-100 transition-all duration-300">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Give</h3>
              <p className="text-slate-600 leading-relaxed">
                Choose a charity. A portion of your subscription automatically supports your selected cause every month.
              </p>
            </div>
            <div className="group text-center">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-6 group-hover:scale-110 group-hover:bg-amber-100 transition-all duration-300">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Win</h3>
              <p className="text-slate-600 leading-relaxed">
                Take part in monthly draws. Match your scores to the draw numbers to win across multiple prize tiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CHARITY SECTION */}
      <section className="py-24 bg-slate-50" id="charity">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Your subscription can support a cause you choose.</h2>
            <p className="text-lg text-slate-600">
              When you subscribe, you decide where your contribution goes. You can even increase your contribution percentage at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Example Charity Cards */}
            {[
              { title: 'Global Education Fund', desc: 'Providing educational resources to underprivileged children worldwide.', icon: '📚' },
              { title: 'Ocean Cleanup Initiative', desc: 'Dedicated to removing plastic pollution from our oceans and coastlines.', icon: '🌊' },
              { title: 'Healthcare Heroes', desc: 'Supporting frontline medical workers and providing healthcare access.', icon: '⚕️' },
            ].map((charity, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-4 border border-slate-100">
                  {charity.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{charity.title}</h3>
                <p className="text-sm text-slate-600">{charity.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. REWARDS / DRAW SECTION */}
      <section className="py-24 bg-white" id="rewards">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Monthly Rewards</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                A portion of every subscription goes into the monthly prize pool. Your latest five retained scores are your ticket. If they match the monthly draw, you win.
              </p>
              <ul className="space-y-6">
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-bold text-slate-900">5-Number Match (40% Pool)</h4>
                    <p className="text-slate-600">The jackpot. Rolls over to the next month if unclaimed.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-bold text-slate-900">4-Number Match (35% Pool)</h4>
                    <p className="text-slate-600">Shared among all winners who match 4 out of 5 numbers.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-bold text-slate-900">3-Number Match (25% Pool)</h4>
                    <p className="text-slate-600">Shared among all winners who match 3 out of 5 numbers.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            {/* Visual representation of the draw */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-blue-50 rounded-3xl transform rotate-3 scale-105 -z-10"></div>
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                <h3 className="text-center text-sm font-semibold text-slate-400 tracking-widest uppercase mb-8">Example Draw Result</h3>
                <div className="flex justify-center gap-3 md:gap-4 mb-8">
                  {[12, 24, 31, 38, 42].map((num, i) => (
                    <div key={i} className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl md:text-2xl font-bold shadow-md">
                      {num}
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Total Prize Pool</p>
                  <p className="text-3xl font-bold text-slate-900">₹128,400</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. IMPACT / CTA SECTION */}
      <section className="py-24 bg-slate-900 text-white text-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Every round can do more.</h2>
            <p className="text-xl text-slate-400 mb-10 font-light">
              Ready to play with purpose? Track your progress, support great causes, and win rewards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-500 transition-colors shadow-lg">
                Join Golfish <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
