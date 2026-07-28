'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { Zap, Bike, Users, ShieldCheck, TrendingUp, Sparkles, LucideHome } from 'lucide-react';

/**
 * AnimatedCounter component hooks into Framer Motion's imperative animate API
 * to roll up values smoothly once the container enters the viewport.
 */
function AnimatedCounter({ from = 0, to, duration = 1.6, decimals = 0, suffix = "" }) {
  const nodeRef = useRef(null);
  const inView = useInView(nodeRef, { once: true, margin: "-50px" });
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => latest.toFixed(decimals) + suffix);

  useEffect(() => {
    if (inView) {
      const controls = animate(count, to, {
        duration: duration,
        ease: [0.16, 1, 0.3, 1],
      });
      return controls.stop;
    }
  }, [inView, count, to, duration]);

  return <motion.span ref={nodeRef}>{rounded}</motion.span>;
}

export default function CampusPulse() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState(0);
  const [liveRiders, setLiveRiders] = useState(42);

  // Simulate a live backend pulse (e.g. Supabase realtime) shifting the online driver pool
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveRiders((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next >= 35 && next <= 55 ? next : prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const metricsData = [
    {
      id: "velocity",
      title: "Logistics Velocity",
      label: "Average Delivery Time",
      icon: Bike,
      metricComp: <AnimatedCounter to={18.4} decimals={1} suffix=" mins" />,
      badge: (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold tracking-wide shadow-sm">
          <Zap className="w-3 h-3 fill-emerald-500/10 animate-pulse" />
          <span>4.2m faster than peak</span>
        </div>
      ),
      glowColor: "rgba(16,185,129,0.06)"
    },
    {
      id: "fleet",
      title: "Active Fleet Pool",
      label: "Student Runners Online",
      icon: Users,
      metricComp: (
        <div className="flex items-baseline gap-2">
          <span>{liveRiders}</span>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-normal">Runners</span>
        </div>
      ),
      badge: (
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-background border border-border/60 text-foreground text-[11px] font-medium shadow-sm">
          <div className="relative w-2 h-2 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute w-2 h-2 bg-emerald-500 rounded-full"
            />
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full z-10" />
          </div>
          <span className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground">Live Pulse</span>
        </div>
      ),
      glowColor: "rgba(59,130,246,0.06)"
    },
    {
      id: "economy",
      title: "Skills Economy Volume",
      label: "Verified Student Freelancers",
      icon: ShieldCheck,
      metricComp: <AnimatedCounter to={120} suffix="+ Experts" />,
      badge: (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium tracking-wide">
          <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mr-0.5">Verticals:</span>
          <span className="text-foreground">Tech, Styling</span>
        </div>
      ),
      glowColor: "rgba(147,51,234,0.06)"
    }
  ];

  return (
    <section className="w-full max-w-6xl mx-auto bg-background py-8 sm:py-17 relative overflow-hidden antialiased">
      {/* Background Micro-Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.02)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header Architecture */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-4 sm:gap-6">
          <div className="space-y-2.5">
            
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
              Campus Operations Network
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md font-normal leading-relaxed">
              Real-time transactional monitoring, localized fulfillment speed, and peer-to-peer liquidity indexes.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-mono font-semibold tracking-wider uppercase text-muted-foreground bg-muted/30 border border-border/40 px-2.5 py-1.5 rounded-lg shadow-inner w-fit">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Active Interval: 2026.05.29
          </div>
        </div>

        {/* Micro-Interactive Filter Tabs ONLY visible on mobile viewports */}
        <div className="flex md:hidden items-center gap-1 bg-muted/60 border border-border/40 p-1 rounded-xl w-full mb-6 shadow-sm">
          {metricsData.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeMobileTab === idx;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMobileTab(idx)}
                className={`flex-1 relative flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg transition-colors duration-200 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePulseTab"
                    className="absolute inset-0 bg-background border border-border/60 rounded-lg shadow-inner"
                    transition={{ type: "spring", stiffness: 180, damping: 20 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 truncate">{item.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Matrix Grid */}
        <div className="relative">
          {/* Desktop Version: Full 3-Column Grid Layout */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
            }}
            className="hidden md:grid grid-cols-3 gap-6 lg:gap-8"
          >
            {metricsData.map((item, index) => (
              <CardElement 
                key={item.id} 
                item={item} 
                index={index} 
                hoveredIndex={hoveredIndex} 
                setHoveredIndex={setHoveredIndex} 
              />
            ))}
          </motion.div>

          {/* Mobile Viewport Version: Smooth Animated Presentation Frame */}
          <div className="block md:hidden min-h-[170px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMobileTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <CardElement 
                  item={metricsData[activeMobileTab]} 
                  index={activeMobileTab} 
                  hoveredIndex={null} 
                  setHoveredIndex={() => {}} 
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </section>
  );
}

/**
 * Reusable Card Layer Enclosure engineered for robust responsivness
 */
function CardElement({ item, index, hoveredIndex, setHoveredIndex }) {
  const IconComponent = item.icon;
  const isHovered = hoveredIndex === index;

  return (
    <div
      onMouseEnter={() => setHoveredIndex(index)}
      onMouseLeave={() => setHoveredIndex(null)}
      className="relative group cursor-default w-full"
    >
      {/* Background Radial Ambiance Blur */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 blur-2xl z-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${item.glowColor}, transparent 65%)`
        }}
        animate={{ scale: isHovered ? 1.1 : 1.0 }}
        transition={{ type: "spring", stiffness: 80, damping: 12 }}
      />

      {/* Primary Visual Surface Card */}
      <div className="w-full h-full relative z-10 rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/20 backdrop-blur-md p-5 sm:p-6 lg:p-8 flex flex-col justify-between transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:border-border/80">
        
        <div className="space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-muted-foreground/80 uppercase">
              {item.title}
            </span>
            <div className="p-2 rounded-xl bg-muted/60 border border-border/40 group-hover:bg-foreground group-hover:text-background transition-all duration-300 shadow-inner">
              <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.75]" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] sm:text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              {item.label}
            </p>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-sans text-foreground">
              {item.metricComp}
            </h3>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-border/30 flex items-center justify-between">
          {item.badge}
        </div>
      </div>
    </div>
  );
}