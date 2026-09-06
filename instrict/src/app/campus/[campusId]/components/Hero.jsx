'use client';

import Link from 'next/link';
import { useCampusStore } from '@/store/useCampusStore';
import { ShieldCheck, Layers, Bike, Sparkles, ArrowRight, User2 } from 'lucide-react';

export default function HeroSection() {
  const { campus } = useCampusStore();

  const matrixNodes = [
    {
      icon: <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: "Students",
      desc: "Order from canteens and campus shops, or post an errand and get it done / delivered to your hostel or department.",
      action: "Get started as a student",
      href: "/auth/student",
      tint: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    {
      icon: <User2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Vendors & Freelancers",
      desc: "List your canteen, shop, or service and reach students on your campus who are already ordering.",
      action: "Register your business",
      href: "/auth/vendor",
      tint: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50",
      button: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      icon: <Bike className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: "Riders",
      desc: "Pick up delivery runs between classes, on your own schedule, and get paid out fast.",
      action: "Start riding",
      href: "/auth/rider",
      tint: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",
      button: "bg-blue-600 hover:bg-blue-700",
    }
  ];

  return (
    <section className="relative max-w-6xl mx-auto w-full flex flex-col bg-white dark:bg-slate-950 text-slate-950 dark:text-white overflow-hidden transition-colors duration-500">

      {/* Editorial Frame Layout Grid Lines */}
      <div className="absolute inset-y-0 left-1/4 w-[1px] bg-slate-100 dark:bg-slate-900 hidden lg:block pointer-events-none" />
      <div className="absolute inset-y-0 right-1/4 w-[1px] bg-slate-100 dark:bg-slate-900 hidden lg:block pointer-events-none" />

      {/* High-fidelity Architectural Ambient Nodes */}
      <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent blur-[160px] rounded-full pointer-events-none" />

      {/* Main Structural Hero Stack */}
      <div className="container relative z-10 mx-auto px-6 pt-7 md:pt-12 pb-16 max-w-7xl">
        <div className="max-w-4xl space-y-6 text-left">

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
      </div>

      {/* Role Picker: three unmistakable choices, not three paragraphs */}
      <div className="w-full relative z-10 px-6 pb-16 md:pb-20">
        <div className="container mx-auto max-w-7xl">

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-900" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
              Choose how you want to use Instrict
            </span>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-900" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matrixNodes.map((node, index) => (
              <Link
                key={index}
                href={node.href}
                className={`group relative flex flex-col justify-between rounded-2xl border p-6 md:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${node.tint}`}
              >
                <div className="space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center">
                    {node.icon}
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                    {node.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {node.desc}
                  </p>
                </div>

                <div
                  className={`mt-6 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-white text-sm font-semibold tracking-tight transition-colors ${node.button}`}
                >
                  {node.action}
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
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