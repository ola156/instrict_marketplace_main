'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ShoppingCart, Clock, Utensils, MapPin, Star, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { ProductSkeleton } from "@/components/ui/ProductSleleton";
import Image from 'next/image';

const CORE_MARKETPLACE = {
  tech: [
    { id: "tech_01", name: "Noise Cancelling Headphones", price: "$120.00", discount: "SALE", stock: 2, timeLeft: "02:14:59", image: "https://images.unsplash.com/photo-1593642532744-d377ab507dc8?auto=format&fit=crop&q=80&w=1200" },
    { id: "tech_02", name: "Mechanical Wireless Keyboard", price: "$65.00", discount: "10% OFF", stock: 4, timeLeft: "08:45:00", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=1200" }
  ],
  clothing: [
    { id: "cloth_03", name: "University Oversized Hoodie", price: "$40.00", discount: "NEW", stock: 15, timeLeft: "23:59:59", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1200" },
    { id: "cloth_04", name: "Vintage Campus Denim Jacket", price: "$55.00", discount: "THRIFT", stock: 1, timeLeft: "01:20:15", image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=1200" }
  ]
};

const CAMPUS_CANTEENS = [
  {
    id: "hub_01",
    name: "The Pavilion Food Court",
    cuisine: "Burgers, Bowls & Shakes",
    rating: "4.8",
    time: "10 - 15 mins",
    status: "Open",
    location: "Student Union — Level 1",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "hub_02",
    name: "Quadside Espresso & Bakery",
    cuisine: "Artisan Coffee & Pastries",
    rating: "4.9",
    time: "5 - 10 mins",
    status: "Crowded",
    location: "Central Library Courtyard",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200"
  },
  {
    id: "hub_03",
    name: "Green Lite Kitchen",
    cuisine: "Salads, Wraps & Vegan",
    rating: "4.6",
    time: "12 - 18 mins",
    status: "Open",
    location: "Science Concourse",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=1200"
  }
];

const springPhysics = { type: "spring", stiffness: 120, damping: 14 };

const parentGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const individualCardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: springPhysics }
};

export default function CampusHubEngine() {
  const [activeTab, setActiveTab] = useState('tech');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <div className="bg-background text-foreground transition-colors duration-500 space-y-16 py-8 sm:py-16 antialiased">
      
      {/* SECTION 1: CORE MARKETPLACE */}
      <section className="container mx-auto px-4 sm:px-6 max-w-6xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb),0.03),transparent_40%)] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 relative z-10">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Trending on Campus</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md">Snag premium gear, electronics, and authentic campus apparel.</p>
          </div>

          {/* Micro-Interactive Custom Pill Tabs */}
          <div className="flex items-center gap-1 bg-muted/60 border border-border/40 p-1 rounded-xl w-fit shadow-sm overflow-x-auto max-w-full">
            {['tech', 'clothing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeMarketTab"
                    className="absolute inset-0 bg-background border border-border/60 rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 150, damping: 18 }}
                  />
                )}
                <span className="relative z-10 capitalize">{tab === 'tech' ? 'Gear & Tech' : 'Clothing & Thrift'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Display Matrix Grid (2 columns on mobile, 4 on desktop) */}
        <div className="min-h-[420px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="skeleton-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
              >
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                variants={parentGridVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
              >
                {CORE_MARKETPLACE[activeTab].map((product) => (
                  <motion.div key={product.id} variants={individualCardVariants} whileHover={{ y: -5 }}>
                    <Card className="group relative border border-border/30 bg-muted/10 rounded-xl p-2 transition-all duration-200 hover:bg-muted/20">
                      <CardContent className="p-0 flex flex-col justify-between h-full">
                        
                        <div>
                          {/* Media Box Enclosure synced with marketplace canvas format */}
                          <div className="w-full aspect-[4/3] rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center relative overflow-hidden">
                            <Image 
                              src={product.image} 
                              alt={product.name} 
                              fill 
                              sizes="(max-w-640px) 50vw, (max-w-1024px) 25vw, 25vw"
                              className="object-cover transition-transform duration-300 ease-out group-hover:scale-105" 
                            />
                            <span className="absolute bottom-1.5 right-1.5 font-mono text-[8px] px-1 py-0.5 rounded bg-background/90 text-muted-foreground border border-border/30">
                              {product.discount}
                            </span>
                          </div>

                          <div className="mt-2.5 px-1 space-y-1">
                            <h4 className="font-bold text-xs sm:text-sm text-foreground tracking-tight line-clamp-1">
                              {product.name}
                            </h4>
                            <span className="font-mono text-xs font-black tracking-tight text-foreground block">
                              {product.price}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border/20 space-y-2">
                          <div className="text-[9px] font-mono text-muted-foreground truncate px-1 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-destructive animate-pulse" />
                            <span>{product.stock} left</span>
                          </div>
                          
                          <button className="w-full h-8 bg-foreground hover:bg-primary text-background font-mono text-[10px] font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            <ShoppingCart className="w-3 h-3" />
                            <span>Add To Cart</span>
                          </button>
                        </div>

                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* SECTION 2: CANTEENS & DINING HUBS */}
      <section className="container mx-auto px-4 sm:px-6 max-w-6xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.02),transparent_40%)] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 relative z-10">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Campus Canteens</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md">Check line wait times, locations, and browse active kitchen hubs.</p>
          </div>
          
          <motion.a 
            href="/canteens" 
            whileHover={{ x: 4 }}
            className="group flex items-center gap-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            View All Hubs
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </motion.a>
        </div>

        {/* Clean layout scaling structure synced with canteens view format */}
        <motion.div 
          variants={parentGridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 relative z-10"
        >
          {CAMPUS_CANTEENS.map((canteen) => (
            <motion.div key={canteen.id} variants={individualCardVariants} whileHover={{ y: -5 }}>
              <Card className="group flex flex-col overflow-hidden bg-muted/20 border border-border/40 hover:border-primary/30 rounded-2xl transition-all duration-300 cursor-pointer">
                <CardContent className="p-0 flex flex-col h-full">
                  
                  {/* Visual Content Block */}
                  <div className="w-full h-36 relative overflow-hidden bg-muted">
                    <Image 
                      src={canteen.image} 
                      alt={canteen.name} 
                      fill 
                      sizes="(max-w-640px) 100vw, (max-w-768px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-70" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <span className="absolute bottom-3 right-3 text-[9px] font-mono bg-background/90 text-muted-foreground px-2 py-0.5 rounded-md border border-border/20">
                      {canteen.status}
                    </span>
                  </div>

                  {/* Informational Meta Segments matched to the marketplace template style */}
                  <div className="p-4 pt-0 relative flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-lg shadow-sm -mt-5 relative z-10">
                        <Utensils className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm sm:text-base text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {canteen.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9px] font-mono bg-background text-muted-foreground border border-border/40 px-2 py-0.5 rounded">
                            {canteen.cuisine}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-xs font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500" /> {canteen.rating}
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="text-muted-foreground font-normal text-[10px]">{canteen.time}</span>
                      </div>
                      <span className="text-primary text-[10px] uppercase tracking-wider font-black group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                        <span>Open Menu</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border/30 p-2 bg-muted/10 rounded-xl space-y-3">
      <ProductSkeleton className="w-full aspect-[4/3] rounded-lg bg-muted/60" />
      <ProductSkeleton className="h-3 w-1/2 bg-muted/40 px-1" />
      <ProductSkeleton className="h-4 w-1/3 bg-muted/40 px-1" />
      <ProductSkeleton className="h-8 w-full rounded-lg bg-muted/60" />
    </div>
  );
}