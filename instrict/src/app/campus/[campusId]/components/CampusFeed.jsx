'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, 
  BookOpen, 
  Briefcase, 
  Clock, 
  Star, 
  MapPin, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

// --- MOCK INITIAL FEED DATA ---
const INITIAL_FEED = [
  {
    id: "feed_01",
    type: "food",
    timestamp: "1m ago",
    user: { name: "Timi O.", location: "Bello Hall", avatarBg: "bg-orange-500/10 text-orange-500" },
    meta: { item: "Amala & Abula", source: "Sub-Canteen", speed: "⚡ Express" },
    content: "Just ordered a steaming plate from Sub-Canteen. Delivery ETA is under 12 mins. Out for distribution."
  },
  {
    id: "feed_02",
    type: "trade",
    timestamp: "4m ago",
    user: { name: "Ayo M.", location: "Mellanby Hall", avatarBg: "bg-blue-500/10 text-blue-500" },
    meta: { item: "PHY 201 Textbook", price: "₦3,500", condition: "Mint" },
    content: "Essential Physics for 200L listed in pristine condition. No highlights or torn pages. Pickup at Mellanby common room."
  },
  {
    id: "feed_03",
    type: "gig",
    timestamp: "12m ago",
    user: { name: "Ola D.", location: "Off-Campus", avatarBg: "bg-blue-500/10 text-blue-500" },
    meta: { service: "Branding Contract", rating: "4.9", client: "Tech Startup" },
    content: "Just locked in a comprehensive UI/UX redesign and branding contract for a student-led fintech project."
  },
  {
    id: "feed_05",
    type: "food",
    timestamp: "32m ago",
    user: { name: "Chidi K.", location: "Tedder Hall", avatarBg: "bg-orange-500/10 text-orange-500" },
    meta: { item: "Gourmet Burger Combo", source: "Quad Bites", speed: "Standard" },
    content: "Late-night fuel secured. The lines at Quad Bites are packing up, order through the terminal runner network instead."
  },
  {
    id: "feed_06",
    type: "trade",
    timestamp: "1h ago",
    user: { name: "Efe Z.", location: "Queen Idia Hall", avatarBg: "bg-blue-500/10 text-blue-500" },
    meta: { item: "M1 MacBook Air 8GB", price: "₦420,000", condition: "9/10" },
    content: "Upgrading rig. Battery health is at 88%. Comes with original brick box and an extra type-C hub."
  }
];

// --- REAL-TIME POOL DATA FOR LIVE INJECTIONS ---
const LIVE_SIMULATION_POOL = [
  {
    type: "food",
    user: { name: "Seyi A.", location: "Nnamdi Azikiwe Hall", avatarBg: "bg-orange-500/10 text-orange-500" },
    meta: { item: "Jollof Rice & Chicken", source: "Jash Food Cafe", speed: "⚡ Express" },
    content: "Just routed a priority runner request to cross-campus hubs. Fulfilling order now."
  },
  {
    type: "trade",
    user: { name: "Favour O.", location: "Independence Hall", avatarBg: "bg-blue-500/10 text-blue-500" },
    meta: { item: "Calculator FX-991EX", price: "₦12,500", condition: "Like New" },
    content: "Required for forthcoming engineering finals. Dropping off at the central faculty tier."
  },
  {
    type: "gig",
    user: { name: "Damian P.", location: "Sultan Bello", avatarBg: "bg-blue-500/10 text-blue-500" },
    meta: { service: "Python Tutoring", rating: "5.0", client: "100L Cohort" },
    content: "Completed a 2-hour crash session on data structures. Booking portal opened."
  }
];

const CATEGORY_MAP = {
  food: { label: "Food Pack", icon: Utensils, badgeClass: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  trade: { label: "Peer Trade", icon: BookOpen, badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  gig: { label: "Gig Economy", icon: Briefcase, badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
};

export default function CampusFeedMasonry() {
  const [posts, setPosts] = useState(INITIAL_FEED);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    setIsLiveConnected(true);

    const simulatedChannel = {
      subscribe: (callback) => {
        const interval = setInterval(() => {
          const template = LIVE_SIMULATION_POOL[Math.floor(Math.random() * LIVE_SIMULATION_POOL.length)];
          const generatedPost = {
            ...template,
            id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: "Just now"
          };
          callback(generatedPost);
        }, 7000);

        return () => clearInterval(interval);
      }
    };

    const unsubscribe = simulatedChannel.subscribe((payload) => {
      // We enforce strict slice boundaries to prevent layout explosion
      // Max 8 elements rendered on mobile, max 14 retained for big screens
      setPosts((prev) => [payload, ...prev.slice(0, 13)]);
    });

    return () => unsubscribe();
  }, []);

  return (
    <section className="w-full bg-background text-foreground py-10 sm:py-16 px-2 relative overflow-hidden antialiased">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.02),transparent_40%)] pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        
        {/* Module Header Panel */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4 border-b border-border/40 pb-6 sm:pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-muted border border-border/50 text-muted-foreground text-[11px] font-mono font-medium tracking-tight">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLiveConnected ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
              </span>
              <span>Instrict Channel</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Live Activity Stream
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-lg leading-relaxed">
              See what students across campus are trading, selling, sharing, and collaborating on in real-time.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-xs font-semibold bg-background/50 backdrop-blur-md border border-border/50 p-2 rounded-xl shadow-sm">
            <div className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>High Volume Index</span>
            </div>
          </div>
        </div>

        {/* --- MOBILE LAYOUT: SIDE-BY-SIDE HORIZONTAL SWIPER (Max 8 Cards) --- */}
        <div className="flex md:hidden w-full overflow-x-auto pb-6 pt-1 gap-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {posts.slice(0, 8).map((post) => (
              <div key={post.id} className="w-[85vw] sm:w-[50vw] flex-shrink-0 snap-align-start snap-always">
                <FeedCard post={post} />
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* --- DESKTOP LAYOUT: STABLE MASONRY CANVAS --- */}
        <div className="hidden md:block columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5 [column-fill:balance] min-h-[500px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {posts.map((post) => (
              <FeedCard key={post.id} post={post} isDesktop />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/**
 * Single High-End Micro-Card Architecture
 */
function FeedCard({ post, isDesktop = false }) {
  const cfg = CATEGORY_MAP[post.type] || CATEGORY_MAP.food;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout={isDesktop ? "position" : false}
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -15 }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 18,
        layout: { type: "spring", stiffness: 160, damping: 18 }
      }}
      whileHover={isDesktop ? { y: -4 } : undefined}
      className="break-inside-avoid relative w-full h-full rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all duration-300 flex flex-col justify-between group"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-muted/5 to-muted/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />

      <div className="relative z-10 space-y-3.5">
        {/* Header Metadata Rows */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg ${post.user.avatarBg} flex items-center justify-center font-black font-mono text-[11px] flex-shrink-0 shadow-inner`}>
              {post.user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] font-bold tracking-tight text-foreground truncate">
                {post.user.name}
              </h4>
              <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-muted-foreground/60" />
                <span className="truncate">{post.user.location}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              <span>{post.timestamp}</span>
            </div>
            <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[8px] font-bold tracking-wide uppercase ${cfg.badgeClass}`}>
              <Icon className="w-2.5 h-2.5" />
              <span>{cfg.label}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <p className="text-xs font-normal text-foreground/90 leading-relaxed tracking-normal line-clamp-3 md:line-clamp-none">
          {post.content}
        </p>

        {/* Dynamic Context Parameters */}
        <div className="pt-2.5 border-t border-border/30 mt-1">
          {post.type === 'food' && (
            <div className="flex items-center justify-between text-[11px] bg-muted/40 border border-border/40 p-2 rounded-xl">
              <span className="font-bold text-foreground truncate max-w-[130px]">{post.meta.item}</span>
              <span className="text-muted-foreground text-[9px] bg-background px-1.5 py-0.5 rounded border border-border/60 font-medium">{post.meta.speed}</span>
            </div>
          )}

          {post.type === 'trade' && (
            <div className="flex items-center justify-between text-[11px] bg-muted/40 border border-border/40 p-2 rounded-xl">
              <span className="font-bold text-blue-500 font-mono">{post.meta.price}</span>
              <span className="text-[9px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/60 font-bold uppercase tracking-wider">{post.meta.condition}</span>
            </div>
          )}

          {post.type === 'gig' && (
            <div className="flex items-center justify-between text-[11px] bg-muted/40 border border-border/40 p-2 rounded-xl">
              <span className="font-bold text-foreground truncate max-w-[130px]">{post.meta.service}</span>
              <div className="flex items-center gap-0.5 text-amber-500 font-mono text-[9px] bg-background px-1.5 py-0.5 rounded border border-border/60 font-bold">
                <Star className="w-2.5 h-2.5 fill-amber-500 stroke-none" />
                <span>{post.meta.rating}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
      </div>
    </motion.div>
  );
}