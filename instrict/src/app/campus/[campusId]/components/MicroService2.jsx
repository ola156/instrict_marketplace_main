'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  DollarSign, 
  ArrowRight, 
  AlertCircle, 
  Bike
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { ProductSkeleton } from "@/components/ui/ProductSleleton";
import Image from 'next/image';

const DUMMY_ERRANDS = [
  {
    id: "errand_01",
    title: "Pick up printing bundle from Room 304",
    description: "Need 45 pages of lecture handouts picked up and brought to the Science Concourse. Paid via wallet.",
    budget: "₦1,500",
    timeLimit: "Within 30 mins",
    category: "quick",
    pickup: "Dorm Print Hub (Room 304)",
    dropoff: "Science Concourse Hall B",
    client: { name: "Pamela O.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" }
  },
  {
    id: "errand_02",
    title: "Fast-food delivery from The Pavilion",
    description: "2 chicken boxes + large dynamic drinks. Pan is crowded, need a peer rider fast to beat the lunch rush.",
    budget: "₦2,500",
    timeLimit: "Within 45 mins",
    category: "high-budget",
    pickup: "The Pavilion Food Court",
    dropoff: "Mellanby Hall Block C",
    client: { name: "Glory I.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
  },
  {
    id: "errand_03",
    title: "Return library textbook bundles",
    description: "Heavy stack of Climatology textbooks that need return logging before the 4:00 PM closing cutoff.",
    budget: "₦1,200",
    timeLimit: "By 3:30 PM",
    category: "quick",
    pickup: "Kuti Hall Common Room",
    dropoff: "Central Kenneth Dike Library",
    client: { name: "Marvellous O.", avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=150" }
  },
  {
    id: "errand_04",
    title: "Bulk laundry delivery assignment",
    description: "Pick up heavy laundry canvas bag from gate border and run it up to the hostel room floor levels.",
    budget: "₦4,500",
    timeLimit: "Flexible Today",
    category: "high-budget",
    pickup: "Campus North Gate Border",
    dropoff: "Tedder Hall Top Floor",
    client: { name: "Seyi A.", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150" }
  }
];

const springTransition = { type: "spring", stiffness: 140, damping: 15 };

export default function CampusErrandFeed() {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const filteredErrands = DUMMY_ERRANDS.filter(errand => {
    if (activeTab === 'all') return true;
    return errand.category === activeTab;
  });

  return (
    <div className="w-full max-w-6xl mx-auto bg-background border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none">
      
      {/* Interactive Hub Header */}
      <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-r from-card to-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg tracking-tight text-foreground">Live Errand Board</h3>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          </div>
          <p className="text-muted-foreground text-xs">Run active campus tasks for peers. Fast payouts via Paystack.</p>
        </div>

        {/* Action Trays Section */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 min-w-0">
          {/* Custom Tab Tray Switcher */}
          <div className="flex items-center gap-1 bg-muted border border-border/40 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'quick', label: '⚡ Quick' },
              { id: 'high-budget', label: '🔥 High Payout' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-colors duration-200 whitespace-nowrap ${
                  activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeErrandTabAlt"
                    className="absolute inset-0 bg-background border border-border/60 rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 160, damping: 16 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* View All Redirect Hook with Micro-Animated Arrow */}
          <button 
            onClick={() => console.log('Navigate to all errands routing pipeline')}
            className="group flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors pl-2"
          >
            <span>View All Errands</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Main Display Grid Frame */}
      <div className="p-4 bg-card/40 min-h-[400px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="grid-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {Array.from({ length: 2 }).map((_, i) => <ErrandSkeletonCard key={i} />)}
            </motion.div>
          ) : filteredErrands.length === 0 ? (
            <motion.div
              key="grid-empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/20"
            >
              <AlertCircle className="w-8 h-8 text-muted-foreground stroke-1 mb-2" />
              <p className="text-sm font-bold text-foreground">No active runs available</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">Check back soon or shift your active tier selection tabs.</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid-active"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredErrands.map((errand) => (
                <motion.div
                  key={errand.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: springTransition }
                  }}
                  whileHover={{ y: -2 }}
                  className="group flex h-full"
                >
                  <Card className="w-full border border-border/60 bg-white dark:bg-slate-900/40 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/[0.015] flex flex-col justify-between">
                    <CardContent className="p-4 flex flex-col h-full justify-between">
                      
                      {/* Top Context Panel Segment */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Profile Circle Frame */}
                            <div className="relative h-7 w-7 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-border">
                              <Image 
                                src={errand.client.avatar} 
                                alt={errand.client.name} 
                                fill 
                                sizes="28px"
                                className="object-cover" 
                              />
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground truncate">{errand.client.name}</span>
                          </div>

                          {/* Budget Tag Pill */}
                          <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md flex-shrink-0">
                            <DollarSign className="w-3 h-3 stroke-[2.5]" />
                            <span className="font-mono text-xs font-black tracking-tight">{errand.budget}</span>
                          </div>
                        </div>

                        {/* Title and Detail Run out */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-foreground tracking-tight line-clamp-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                            {errand.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {errand.description}
                          </p>
                        </div>
                      </div>

                      {/* Route Pathing Indicator Matrix */}
                      <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                        <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            <span className="font-bold text-foreground/80 flex-shrink-0 w-8">From:</span>
                            <span className="truncate">{errand.pickup}</span>
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="font-bold text-foreground/80 flex-shrink-0 w-8">To:</span>
                            <span className="truncate">{errand.dropoff}</span>
                          </div>
                        </div>

                        {/* Bottom Metadata & Dynamic CTA Trigger */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <span>{errand.timeLimit}</span>
                          </div>

                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all duration-200"
                          >
                            <span>Accept</span>
                            <Bike className="w-3.5 h-3.5 stroke-[2]" />
                          </motion.button>
                        </div>

                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ErrandSkeletonCard() {
  return (
    <div className="border border-border/60 p-4 bg-card rounded-xl space-y-4 shadow-sm h-full flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ProductSkeleton className="h-6 w-6 rounded-full bg-muted" />
            <ProductSkeleton className="h-3 w-16 bg-muted" />
          </div>
          <ProductSkeleton className="h-5 w-16 rounded bg-muted" />
        </div>
        <ProductSkeleton className="h-4 w-1/2 bg-muted" />
        <ProductSkeleton className="h-3 w-5/6 bg-muted" />
      </div>
      <div className="pt-3 border-t border-border/40 space-y-3">
        <ProductSkeleton className="h-3 w-2/3 bg-muted" />
        <div className="flex justify-between items-center">
          <ProductSkeleton className="h-3 w-20 bg-muted" />
          <ProductSkeleton className="h-7 w-20 rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}