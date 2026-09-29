'use client';

import React, { useState, useEffect } from 'react';
import { Truck } from "lucide-react";
import News from '../News';
import Helpdesk from '../Helpdesk';
import AvailableOrders from './AvailableOrders';
import ActiveDelivery from './ActiveDelivery';
import EarningsTab from './EarningsTab';
import { supabase } from '@/utils/supabase';

export default function CourierDashboard() {
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'earnings' | 'berita' | 'bantuan'>('available');
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const menuItems = [
    { id: 'available', label: 'Tersedia', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
    { id: 'active', label: 'Pengantaran', icon: <Truck className="w-5 h-5" /> },
    { id: 'earnings', label: 'Saldo', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'berita', label: 'Berita', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" /></svg> },
    { id: 'bantuan', label: 'Bantuan', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col md:flex-row">
      
      {/* ----------------- DESKTOP SIDEBAR ----------------- */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r border-neutral-200 shrink-0 sticky top-[64px] h-[calc(100vh-64px)]">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-black text-orange-600 tracking-tighter">KURIR CENTER</h2>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all text-left ${
                activeTab === item.id 
                  ? 'bg-orange-50 text-orange-700' 
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className={activeTab === item.id ? 'text-orange-600' : 'text-neutral-400'}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ----------------- MOBILE HEADER ----------------- */}
      <header className="md:hidden bg-white shadow-sm sticky top-0 z-10 border-b border-neutral-200">
        <div className="px-4 py-4 flex justify-between items-center max-w-xl mx-auto">
          <div>
            <h1 className="text-xl font-black text-orange-600 tracking-tighter">LASTBITE KURIR</h1>
          </div>
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-black border-2 border-orange-200 shadow-sm">
            K
          </div>
        </div>
      </header>

      {/* ----------------- MAIN CONTENT ----------------- */}
      <main className="flex-1 p-4 md:p-8 w-full max-w-4xl mx-auto pb-24 md:pb-8">
        {activeTab === 'available' && userId && <AvailableOrders userId={userId} setActiveTab={setActiveTab} />}
        {activeTab === 'active' && userId && <ActiveDelivery userId={userId} setActiveTab={setActiveTab} />}
        {activeTab === 'earnings' && userId && <EarningsTab userId={userId} />}
        {activeTab === 'berita' && <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6"><News role="kurir" /></div>}
        {activeTab === 'bantuan' && userId && <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6"><Helpdesk role="kurir" userId={userId} /></div>}
      </main>

      {/* ----------------- MOBILE BOTTOM NAV ----------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex justify-around shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] pb-safe z-20">
        <div className="flex w-full max-w-xl mx-auto">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center py-3 px-2 flex-1 transition-all ${
                activeTab === item.id ? 'text-orange-600 scale-110' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <div className={`w-10 h-8 mb-1 rounded-xl flex items-center justify-center font-black transition-colors ${
                activeTab === item.id ? 'bg-orange-100' : 'bg-transparent'
              }`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      
    </div>
  );
}
