'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Star, ArrowUpRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { ProductSkeleton } from "@/components/ui/ProductSleleton";
import Image from 'next/image';

const DUMMY_SERVICES = [
  {
    id: 1,
    title: "Premium Graphic Design",
    provider: "Alex Rivers (Senior)",
    rate: "$25.00/hr",
    rating: "4.9",
    reviews: 24,
    category: "Design",
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=1200",
    availability: "Available Today"
  },
  {
    id: 2,
    title: "High-Speed Laser Printing",
    provider: "Dorm Print Hub (Room 304)",
    rate: "$0.10/pg",
    rating: "5.0",
    reviews: 142,
    category: "Printing",
    image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=1200",
    availability: "Instant Pickup"
  },
  {
    id: 3,
    title: "Professional Resume Review",
    provider: "Career Services Peer",
    rate: "$15.00/fix",
    rating: "4.8",
    reviews: 38,
    category: "Consulting",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200",
    availability: "2 Days Turn"
  },
  {
    id: 4,
    title: "Campus Portrait Photography",
    provider: "Visuals by Malik",
    rate: "$40.00/sess",
    rating: "4.9",
    reviews: 67,
    category: "Photography",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1200",
    availability: "Weekend Only"
  }
];

export default function CampusServices() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-8 sm:py-16 bg-background text-foreground transition-colors duration-500 antialiased">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.02),transparent_40%)] pointer-events-none" />
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 relative z-10">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Campus Services
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md">
              Hire talented peers for design, photography, printing, and academic consulting.
            </p>
          </div>
          
          <a href="/services" className="group flex items-center gap-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
            Explore Services
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Services Grid: 1-wide on base mobile, 2-wide on sm, 4-wide on desktop to safely match reference specs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {loading 
            ? Array.from({ length: 4 }).map((_, i) => <ServiceSkeletonCard key={i} />)
            : DUMMY_SERVICES.map((service) => (
                <div 
                  key={service.id}
                  className="group flex flex-col overflow-hidden bg-muted/20 border border-border/40 hover:border-primary/30 rounded-2xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="w-full h-36 relative overflow-hidden bg-muted">
                    <Image 
                      src={service.image} 
                      alt={service.title} 
                      fill
                      sizes="(max-w-640px) 100vw, (max-w-1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                   
                  </div>
                  
                  <div className="p-4 pt-0 relative flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Badge / Avatar replacement wrapper styled as an interactive service Category Badge */}
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-[10px] font-black uppercase text-center shadow-sm -mt-5 relative z-10 tracking-tighter px-0.5 truncate">
                        {service.category.substring(0, 4)}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm sm:text-base text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {service.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9px] font-mono bg-background text-muted-foreground border border-border/40 px-2 py-0.5 rounded">
                            by {service.provider.split(' ')[0]}
                          </span>
                          <span className="text-[9px] font-mono bg-background text-muted-foreground border border-border/40 px-2 py-0.5 rounded">
                            {service.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-xs font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500" /> {service.rating}
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="text-muted-foreground font-normal text-[10px]">{service.availability}</span>
                      </div>
                      <span className="text-primary text-[10px] uppercase tracking-wider font-black group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                        <span>Book Now</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
            ))
          }
        </div>
      </div>
    </section>
  );
}

function ServiceSkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden bg-muted/20 border border-border/40 rounded-2xl p-4 pt-0 space-y-3">
      <div className="w-full h-36 -mx-4 relative bg-muted/60" />
      <ProductSkeleton className="w-10 h-10 rounded-xl bg-muted -mt-5 relative z-10" />
      <ProductSkeleton className="h-4 w-3/4 bg-muted/50" />
      <ProductSkeleton className="h-3 w-1/2 bg-muted/30" />
      <div className="pt-3 border-t border-border/20 flex justify-between items-center">
        <ProductSkeleton className="h-3 w-16 bg-muted/40" />
        <ProductSkeleton className="h-3 w-12 bg-muted/40" />
      </div>
    </div>
  );
}