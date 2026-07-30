'use client';

import Link from 'next/link';
import { useCampusStore } from '@/store/useCampusStore';
import { ShieldCheck, Layers, Bike, Sparkles } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

export default function HeroSection() {
  const { campus } = useCampusStore();

  const matrixNodes = [
    {
      icon: <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      title: "Students",
      desc: "Order from canteens and campus shops, book services, and get it delivered to your hostel or department.",
      action: "Get started as a student",
      href: "/auth/student"
    },
    {
      icon: <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      title: "Vendors & Freelancers",
      desc: "List your canteen, shop, or service and reach students on your campus who are already ordering.",
      action: "Register your business",
      href: "/auth/vendor"
    },
    {
      icon: <Bike className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      title: "Riders",
      desc: "Pick up delivery runs between classes, on your own schedule, and get paid out fast.",
      action: "Start riding",
      href: "/auth/rider"
    }
  ];

  return (
    <section className="relative max-w-6xl mx-auto w-full min-h-screen flex flex-col justify-between bg-white dark:bg-slate-950 text-slate-950 dark:text-white overflow-hidden transition-colors duration-500">
      
      {/* Editorial Frame Layout Grid Lines */}
      <div className="absolute inset-y-0 left-1/4 w-[1px] bg-slate-100 dark:bg-slate-900 hidden lg:block pointer-events-none" />
      <div className="absolute inset-y-0 right-1/4 w-[1px] bg-slate-100 dark:bg-slate-900 hidden lg:block pointer-events-none" />
      
      {/* High-fidelity Architectural Ambient Nodes */}
      <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent blur-[160px] rounded-full pointer-events-none" />

      {/* Main Structural Hero Stack */}
      <div className="container relative z-10 mx-auto px-6 pt-7 md:pt-12 pb-16 max-w-7xl flex-grow flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column Text Pillar */}
          <div className="lg:col-span-8 space-y-6 text-left">
            
            {/* Context Token Pill */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 backdrop-blur-md animate-[slideUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[9px] font-black tracking-[0.25em] uppercase text-slate-500 dark:text-slate-400">
                {campus ? `${campus} Campus Network` : "Unified Campus Network"}
              </span>
            </div>

            {/* Welcome Headline */}
            <h1 className="text-5xl sm:text-5xl md:text-6xl capitalize font-black tracking-[-0.05em] leading-[0.85] text-slate-950 dark:text-white max-w-4xl animate-[slideUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
              Welcome to your <span className='uppercase'>{campus ? ` ${campus} ` : ' '}</span> <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-slate-400 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-slate-700">
                campus Ecosystem.
              </span>
            </h1>

            {/* Editorial Descriptive Text */}
            <p className="text-base md:text-md text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-normal tracking-tight animate-[slideUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
              Whether you're here to trade, offer your services, or ride for the community pick your role below to get started.
            </p>
          </div>

          {/* Right Column Layout Panel: Live Activity Context Tracker */}
          <div className="lg:col-span-4 hidden lg:block space-y-4 pt-16 animate-[slideUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.4s_both]">
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/10 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Platform State Telemetry</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Active Users</span>
                  <span className="font-mono font-bold"></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Verified Transactions</span>
                  <span className="font-mono font-bold"></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Network Operational Latency</span>
                  <span className="font-mono font-bold text-emerald-500">12ms (Optimal)</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Structural Interactive Dynamic Segment Grid */}
      <div className="w-full border-t border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/10 z-10 relative">
        <div className="container mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-900">
          {matrixNodes.map((node, index) => (
            <Link
              key={index}
              href={node.href}
              className="group p-8 md:p-10 flex flex-col justify-between items-start hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors duration-500 cursor-pointer"
            >
              <div className="space-y-4">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm w-fit">
                  {node.icon}
                </div>
                <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {node.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {node.desc}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all pt-6 group-hover:gap-3">
                <span>{node.action}</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-45" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* High Performance CSS Declarative Matrix */}
      <style jsx global>{`
        @keyframes slideUp {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </section>
  );
}