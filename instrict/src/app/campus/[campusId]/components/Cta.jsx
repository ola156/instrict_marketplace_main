'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, MapPin, Bike, Store,
  PackageCheck, CreditCard, ShieldCheck,
  TrendingUp
} from 'lucide-react';

const WORKFLOWS = {
  student: {
    tag: 'Students',
    steps: [
      { icon: MapPin, stepNum: '01', label: 'Set your delivery location', desc: 'Choose your campus and pin your hostel, hall, or department, so vendors and riders know exactly where to bring your order.' },
      { icon: ShoppingBag, stepNum: '02', label: 'Browse and order', desc: 'Pick from canteens, retail shops, and campus services, add items to your cart, and check out in one place.' },
      { icon: Bike, stepNum: '03', label: 'Track your delivery', desc: 'Pay securely with Paystack, then track your order until a rider picks it up and drops it at your location.' }
    ]
  },
  vendor: {
    tag: 'Vendors',
    steps: [
      { icon: Store, stepNum: '01', label: 'Set up your store', desc: 'Add your menu or products, set stock and opening hours, and choose the campus zones you deliver to.' },
      { icon: ShieldCheck, stepNum: '02', label: 'Get verified', desc: 'Complete verification so students can order from you and riders can pick up your deliveries.' },
      { icon: CreditCard, stepNum: '03', label: 'Receive orders and get paid', desc: 'Accept incoming orders from students, fulfil them, and get your earnings paid out to your vendor wallet.' }
    ]
  },
  rider: {
    tag: 'Riders',
    steps: [
      { icon: ShieldCheck, stepNum: '01', label: 'Get verified', desc: 'Complete rider verification before you can start accepting delivery runs.' },
      { icon: PackageCheck, stepNum: '02', label: 'Go online and accept runs', desc: 'See available deliveries near you, accept the ones that fit your route, and pick up from the vendor.' },
      { icon: TrendingUp, stepNum: '03', label: 'Deliver and get paid', desc: 'Drop off the order and your earnings land in your rider wallet. Withdraw whenever you\'re ready.' }
    ]
  }
};

export default function HowItWorks() {
  const [activeRole, setActiveRole] = useState('student');

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-8 sm:py-16 relative antialiased text-foreground bg-background">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 sm:mb-24">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            How Instrict Works
          </h2>
        </div>

        {/* Role switcher */}
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
                    transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                  />
                )}
                <span>{data.tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        <div className="hidden md:block absolute top-7 left-4 right-4 h-[1px] bg-border/40 z-0" />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-12 relative z-10"
          >
            {WORKFLOWS[activeRole].steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative flex flex-row md:flex-col items-start gap-6 md:gap-5 group">

                  <div className="block md:hidden absolute left-3.5 top-8 bottom-[-32px] w-[1px] bg-border/40 last:hidden" />

                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center border border-border/60 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300 relative z-10">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors stroke-[2]" />
                  </div>

                  <div className="space-y-2 pt-0.5 md:pt-2">
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider font-bold">
                      <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {step.stepNum}
                      </span>
                    </div>

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