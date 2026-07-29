'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, ArrowUpRight } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How does the platform verify that users are actual students?",
    a: "We route authentication through a secure student verification protocol. Users must provide valid campus matriculation details or institutional parameters during onboarding to unlock selling and delivery privileges."
  },
  {
    q: "Is my money safe if a rider drops or cancels my delivery run?",
    a: "Completely. We employ a secure multi-split wallet escrow system. When you pay for a meal or an errand, your funds are safely held by the network and are only split and dispatched to the vendor and rider after you confirm receipt."
  },
  {
    q: "What fees do merchants and riders pay to use the platform?",
    a: "Peer riders retain 100% of tips and 85% of base fares, while the remaining 15% covers dispatch network maintenance. Active student merchants enjoy zero setup fees, paying only a minimal processing percentage on completed checkouts."
  },
  {
    q: "Can I use the exact same student profile to buy and deliver runs?",
    a: "Yes. Your profile database schema is completely unified. You can order lunch to your faculty building in the morning, and toggle your status to active in the dashboard to execute an errand run between classes in the afternoon."
  }
];

export function LandingHelpCenter() {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-16 relative overflow-hidden antialiased">
      {/* Micro Grid Background Detail */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--primary-rgb),0.03),transparent_50%)] pointer-events-none" />

      {/* Header Block */}
      <div className="flex flex-col items-center text-center space-y-3 mb-12 sm:mb-16 relative z-10">
        
        <h3 className="font-black text-xl sm:text-3xl tracking-tight text-foreground">
          Frequently Answered Logistics
        </h3>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-md leading-relaxed">
          Everything you need to know about transactional safety, terminal parameters, and routing structures.
        </p>
      </div>
      
      {/* Accordion List Canvas */}
      <Accordion type="single" collapsible className="w-full space-y-3.5 relative z-10">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem 
            key={idx} 
            value={`item-${idx}`}
            className="group/item rounded-xl px-5 sm:px-6 bg-card/40 backdrop-blur-md transition-all duration-300 data-[state=open]:border-primary/30 data-[state=open]:shadow-md data-[state=open]:bg-gradient-to-r data-[state=open]:from-primary/[0.02] data-[state=open]:via-transparent data-[state=open]:to-transparent overflow-hidden"
          >
            <AccordionTrigger className="text-left font-bold text-sm sm:text-base text-foreground hover:no-underline py-4.5 sm:py-5 tracking-tight group-hover/item:text-primary transition-colors duration-200 data-[state=open]:text-primary [&[data-state=open]>svg]:rotate-180">
              <span className="pr-4 leading-snug">{item.q}</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs sm:text-sm leading-relaxed pb-5 pr-4 max-w-3xl transition-all duration-300 antialiased font-normal">
              <div className="border-l-2 border-primary/20 pl-4 mt-1">
                {item.a}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

    
    </section>
  );
}