"use client";

import React, { useState, useEffect } from "react";
import { TypeAnimation } from "react-type-animation";
import { BadgeCheck, ShieldCheck, ShoppingBag, Moon, Sun, Search, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { useCampusStore } from "@/store/useCampusStore";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Only this campus is actually live right now. Every other row that comes
// back from the campuses table is still shown (so people can see their
// school is on the roadmap) but rendered locked/unselectable, badged
// "Coming soon". Flipping a new campus on later is just changing this set.
const LIVE_CAMPUS_SLUGS = new Set(["ui"]);

// Motion Variants for spring physics transitions
const springTransition = { type: "spring", stiffness: 100, damping: 15 };

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...springTransition, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: springTransition },
};

export default function CampusEntry() {
  const { theme, toggleTheme } = useTheme();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [search, setSearch] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const setCampus = useCampusStore((state) => state.setCampus);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    const savedCampus = localStorage.getItem("selected_campus");
    if (savedCampus) {
      setCampus(savedCampus);
      router.prefetch(`/campus/${savedCampus}`);
      router.replace(`/campus/${savedCampus}`);
    } else {
      setCheckingAuth(false);
    }
  }, [router, setCampus]);

  useEffect(() => {
    fetchCampuses();
  }, []);

  const fetchCampuses = async () => {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (!error && data) {
      // Live campus floats to the top so it's the obvious first option,
      // rather than getting lost alphabetically among "coming soon" ones.
      const sorted = [...data].sort((a, b) => {
        const aLive = LIVE_CAMPUS_SLUGS.has(a.slug);
        const bLive = LIVE_CAMPUS_SLUGS.has(b.slug);
        if (aLive !== bLive) return aLive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setCampuses(sorted);
    }
    setLoadingCampuses(false);
  };

  if (!mounted) return null;

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 animate-pulse" />
          <div className="absolute w-4 h-4 rounded-full bg-primary animate-ping" />
        </div>
      </div>
    );
  }

  const filteredCampuses = campuses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (slug) => {
    if (!slug || !LIVE_CAMPUS_SLUGS.has(slug)) return; // guard: locked campuses aren't selectable

    localStorage.setItem("selected_campus", slug);
    setCampus(slug);
    router.push(`/campus/${slug}`);
  };

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-500 antialiased selection:bg-primary/20">

      {/* LEFT COLUMN: Interactive Gate */}
      <section className="flex-1 flex flex-col justify-center p-6 sm:p-12 md:p-16 relative bg-gradient-to-b from-background via-background to-muted/20">

        {/* Modern Mesh Overlay Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        {/* Floating Glassmorphic Top Bar */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-1 font-black tracking-tight text-xl text-foreground">
             <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-[15deg]">
                                             <Image
                                               src="/logo.svg" 
                                               alt="Instrict Logo" 
                                               width={20} 
                                               height={18} 
                                               className="object-contain"
                                             />
                                           </div> 
            <span className="text-xl">Instrict<span className="text-primary">Marketplace</span></span>
          </div>

          <motion.button
  onClick={toggleTheme}
  className="relative flex items-center w-14 h-8 rounded-full border border-border/40 bg-background/60 backdrop-blur-md shadow-sm px-1 transition-colors"
  aria-label="Toggle theme"
>
  {/* Track icons (static, sit behind the sliding thumb) */}
  <Sun className="absolute left-1.5 w-3.5 h-3.5 text-amber-400" />
  <Moon className="absolute right-1.5 w-3.5 h-3.5 text-indigo-300" />

  {/* Sliding thumb */}
  <motion.div
    className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center z-10"
    animate={{ x: theme === "dark" ? 24 : 0 }}
    transition={{ type: "spring", stiffness: 500, damping: 30 }}
  >
    {theme === "dark" ? (
      <Moon className="w-3.5 h-3.5 text-indigo-400" />
    ) : (
      <Sun className="w-3.5 h-3.5 text-amber-500" />
    )}
  </motion.div>
</motion.button>
        </div>

        {/* Interactive Form Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md mx-auto space-y-8 relative z-10"
        >
          <motion.div variants={itemVariants} className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Find your campus.
            </h2>
            <p className="text-sm text-muted-foreground">
              Select your academic institution to access curated marketplaces and localized hubs.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <Combobox onValueChange={handleSelect}>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
                <ComboboxInput
                  placeholder="Search universities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-14 pl-11 pr-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all shadow-sm group-hover:border-border/80"
                />
              </div>

              <ComboboxContent className="w-[var(--anchor-width)] mt-2 bg-background/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl shadow-shadow/5 p-1.5 overflow-hidden z-50 animate-in fade-in-50 slide-in-from-top-1">
                <ComboboxList className="max-h-[240px] overflow-y-auto custom-scrollbar">
                  {loadingCampuses ? (
                    <div className="space-y-1.5 p-1.5">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-11 rounded-lg bg-muted/60 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredCampuses.length > 0 ? (
                    filteredCampuses.map((campus) => {
                      const isLive = LIVE_CAMPUS_SLUGS.has(campus.slug);
                      return (
                        <ComboboxItem
                          key={campus.id}
                          value={campus.slug}
                          disabled={!isLive}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-all duration-150 select-none ${
                            isLive
                              ? "cursor-pointer text-foreground/90 data-[highlighted]:bg-muted/80 data-[highlighted]:text-primary"
                              : "cursor-not-allowed text-muted-foreground/50"
                          }`}
                        >
                          <span className="tracking-tight">{campus.name}</span>
                          {!isLive && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md bg-muted text-muted-foreground/70 shrink-0">
                              <Lock className="w-2.5 h-2.5" /> Coming soon
                            </span>
                          )}
                        </ComboboxItem>
                      );
                    })
                  ) : (
                    <ComboboxEmpty className="py-6 text-center text-muted-foreground text-sm tracking-tight">
                      No campus found.
                    </ComboboxEmpty>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </motion.div>
        </motion.div>
      </section>

      {/* RIGHT COLUMN: Premium Branding Panel */}
      <section className="hidden md:flex flex-[0.9] lg:flex-1 p-12 lg:p-16 flex-col justify-between relative text-slate-50 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 overflow-hidden">

        {/* Advanced Architecture Mesh & Ambient Lighting Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.3),transparent_45%)]" />
        <div className="absolute top-1/4 -right-20 w-[450px] h-[450px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

        <div className="relative z-10 text-xl lg:text-2xl font-black tracking-tighter">
          <span className="text-white text-sm font-bold uppercase tracking-widest block mb-1">
            Ecosystem Platform.
          </span>
        </div>

        <div className="relative z-10 space-y-4 my-3 max-w-xl">
          <h1 className="text-3xl lg:text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-sm min-h-[110px] lg:min-h-[120px]">
            Own your experience.
            <br />
            Your{" "}
            <span className="text-indigo-300 relative inline-block">
              <TypeAnimation
                sequence={[
                  "community.",
                  2500,
                  "network.",
                  2500,
                  "lifestyle.",
                  2500,
                ]}
                wrapper="span"
                repeat={Infinity}
              />
            </span>
          </h1>

          <p className="text-white/80 dark:text-slate-200/90 text-sm lg:text-md max-w-md font-medium tracking-tight leading-relaxed">
            Connect with verified peers, access premium resources, and interact inside the safest peer-to-peer commerce hub built for your school.
          </p>
        </div>

        {/* Feature Grid: Micro-glassmorphic Stagger-revealed Rows */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 space-y-3 max-w-md"
        >
          {[
            { text: "Verified Student Vendors", icon: BadgeCheck, desc: "Strict domain authentication protocols." },
            { text: "Hand-Delivered On Campus", icon: ShieldCheck, desc: "Zero-friction micro-logistics routes." },
            { text: "Escrow-Protected Payments", icon: ShoppingBag, desc: "Funds held securely until verification." },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ x: 6, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              className="flex items-center gap-4 p-3.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-sm transition-colors cursor-default"
            >
              <div className="p-2 rounded-lg bg-white/10 text-indigo-200">
                <item.icon className="h-5 w-5 stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-white tracking-tight">{item.text}</span>
                <span className="text-xs text-white/60 tracking-tight">{item.desc}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}