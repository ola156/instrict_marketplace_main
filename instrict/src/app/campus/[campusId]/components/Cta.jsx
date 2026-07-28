'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, MapPin, Bike, Store, 
  PackageCheck, CreditCard, ShieldCheck, 
  TrendingUp, Layers
} from 'lucide-react';

const WORKFLOWS = {
  customer: {
    tag: "Users",
    steps: [
      { icon: MapPin, stepNum: "01", label: "Set Target Coordinates", context: "LOCATION SYNC", desc: "Pin your exact lecture hall theater, hostel common room, or department corridor to anchor delivery routing algorithms." },
      { icon: ShoppingBag, stepNum: "02", label: "Broadcast Errand Parameters", context: "PAYLOAD MANIFEST", desc: "Browse real-time digital canteen inventory pools or instantiate a customized custom peer-to-peer manifest request." },
      { icon: Bike, stepNum: "03", label: "Live Escrow Settlement", context: "SECURE TRANSFER", desc: "Monitor dispatch tracking metrics on the canvas grid. Funds are held securely in network escrow until you confirm drop-off." }
    ]
  },
  merchant: {
    tag: "Merchant",
    steps: [
      { icon: Store, stepNum: "01", label: "Configure Inventory Architecture", context: "NODE REGISTRATION", desc: "Provision your active menu structures, initialize stock parameters, and toggle live procurement limits." },
      { icon: ShieldCheck, stepNum: "02", label: "Verify Incoming Pipelines", context: "SECURE INTAKE", desc: "Intercept real-time purchase requests bound directly to verified student matrix profile identities." },
      { icon: CreditCard, stepNum: "03", label: "Automated Capital Split", context: "CLEARANCE CORRIDOR", desc: "Execute transactions cleanly through integrated clearing tracks for automated wallet clearance splits." }
    ]
  },
  rider: {
    tag: "Rider",
    steps: [
      { icon: Bike, stepNum: "01", label: "Initialize Network Presence", context: "FLEET TELEMETRY", desc: "Toggle telemetry to active across the distributed local cluster to index nearby unassigned terminal runs." },
      { icon: PackageCheck, stepNum: "02", label: "Claim Node Obligations", context: "BOUNTY PIPELINE", desc: "Review algorithmic performance metrics: check clear-out payouts, pickup windows, and vector routes." },
      { icon: TrendingUp, stepNum: "03", label: "Trigger Payout Clearances", context: "ASSET SETTLEMENT", desc: "Complete delivery drops securely past terminal thresholds to trigger instant 85% split metrics directly to wallet." }
    ]
  }
};

export default function BorderlessStepSwitcher() {
  const [activeRole, setActiveRole] = useState('customer');

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-8 sm:py-16 relative antialiased text-foreground bg-background">
      
      {/* Navigation and Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 sm:mb-24">
        <div className="space-y-2">
         
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            System Operations Framework
          </h2>
        </div>

        {/* Minimal Typographic Switcher */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-1 self-start md:self-auto max-w-full overflow-x-auto scrollbar-none">
          {Object.entries(WORKFLOWS).map(([key, data]) => {
            const isActive = activeRole === key;
            return (
              <button
                key={key}
                onClick={() => setActiveRole(key)}
                className={`relative px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="borderlessLine"
                    className="absolute bottom-[-5px] left-0 right-0 h-[2px] bg-primary"
                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                  />
                )}
                <span>{data.tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps Component Track */}
      <div className="relative">
        {/* Desktop Process Line Indicator (Connecting line behind data) */}
        <div className="hidden md:block absolute top-7 left-4 right-4 h-[1px] bg-border/40 z-0" />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-12 relative z-10"
          >
            {WORKFLOWS[activeRole].steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative flex flex-row md:flex-col items-start gap-6 md:gap-5 group">
                  
                  {/* Left Line Accent - Appears strictly on mobile to group information vertically */}
                  <div className="block md:hidden absolute left-3.5 top-8 bottom-[-32px] w-[1px] bg-border/40 last:hidden" />

                  {/* Operational Icon Node */}
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center border border-border/60 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300 relative z-10">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors stroke-[2]" />
                  </div>

                  {/* Informational Data Block */}
                  <div className="space-y-2 pt-0.5 md:pt-2">
                    
                    {/* Index Metric Counters */}
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider font-bold">
                      <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {step.stepNum}
                      </span>
                     
                    </div>

                    {/* Step Typography Details */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {step.label}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-normal md:max-w-sm antialiased">
                        {step.desc}
                      </p>
                    </div>

                  </div>

                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

    </section>
  );
}