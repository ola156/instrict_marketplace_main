'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpRight, Shield, Layers, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const MATRIX_CONTENT = [
  {
    id: "students", // Added ID matching your routing matrix
    category: "FOR STUDENTS",
    title: "Secure Peer Trade & Instant Liquidation",
    desc: "Access a trusted marketplace built entirely within your campus security perimeter. Liquidate tech gear, textbooks, or thrift apparel safely with authenticated university peers without leaving your building.",
    icon: <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "creatives", // Added ID matching your routing matrix
    category: "FOR STUDENT CREATIVES",
    title: "Monetize Talents and Accept Local Bounties",
    desc: "Deploy your skills directly into the campus economy. Freelance your graphic design, photography, moving services, or academic printing capabilities to students actively requesting help on-demand.",
    icon: <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "canteens", // Added ID matching your routing matrix
    category: "FOR CAMPUS CANTEENS",
    title: "Optimize Kitchen Metrics & Dining Queues",
    desc: "Transform traditional campus eateries into data-driven smart hubs. Broadcast real-time wait times, display live operating metrics, and process order flows seamlessly to reduce crowd density peaks.",
    icon: <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200",
  }
];

export default function SplitScrollMatrixHub() {
  const router = useRouter();

  // Route to your secondary page while embedding the specific tab context
  const navigateToNode = (nodeId) => {
    router.push(`/roleExplorer?node=${nodeId}`); 
  };

  return (
    <section className="bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-500 py-10 md:py-25 relative">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-slate-100 dark:bg-slate-900" />
      
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl mb-8 md:mb-24 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-slate-400">OPERATIONAL MATRIX</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em] leading-[1.05]">
            One integrated layer for <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
              the entire university perimeter.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {MATRIX_CONTENT.map((item, i) => (
            <div 
              key={i}
              className={`flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/40 dark:bg-slate-900/10 backdrop-blur-md transition-all duration-500 hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-950 group ${
                i === 2 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300 group-hover:border-slate-200 dark:group-hover:border-slate-700">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    {item.category}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-tight transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="space-y-6 mt-auto">
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/60 pt-4">
                  <Button 
                    onClick={() => navigateToNode(item.id)}
                    className="h-10 px-4 rounded-xl bg-slate-950 dark:bg-white hover:bg-blue-600 dark:hover:bg-blue-600 text-white dark:text-slate-950 hover:text-white dark:hover:text-white text-xs font-bold transition-all duration-300 active:scale-95"
                  >
                    Get Started
                  </Button>
                  <Button 
                    variant="link" 
                    onClick={() => navigateToNode(item.id)}
                    className="group/btn h-10 px-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    Explore Node
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:rotate-45 duration-300" />
                  </Button>
                </div>

                <div className={`relative w-full rounded-xl overflow-hidden border border-slate-100 dark:border-slate-900/60 bg-slate-100 dark:bg-slate-900/40 grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:border-slate-200 dark:group-hover:border-slate-800 ${
                  i === 2 ? 'h-36 md:h-48 lg:h-36' : 'h-36 sm:h-44 md:h-36'
                }`}>
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-103"
                    sizes="(max-w-7xl) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent mix-blend-multiply" />
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}