'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "How do you verify that users are actual students?",
    a: "Every account is manually reviewed by campus admins before it can sell or ride — it's not automatic. Someone actually checks before you're allowed to list an item or accept a delivery."
  },
  {
    q: "Is my money safe if a rider drops or cancels my delivery?",
    a: "Yes. Your payment is held in escrow and isn't released until you confirm the order arrived. If a rider cancels or drops a delivery mid-way, the order is reassigned to another rider — your payment stays protected the whole time."
  },
  {
    q: "What fees do vendors and riders pay?",
    a: "Vendors and riders pay a small percentage fee on completed orders. There's no separate signup or listing fee — you only pay when a transaction actually goes through."
  },
  {
    q: "Can I use the same account to buy, sell, or ride?",
    a: "Yes. It's one account — you can order lunch as a student in the morning, then switch to rider mode and pick up delivery runs in the afternoon, all without creating a second profile."
  }
];

export function LandingHelpCenter() {
  return (
    <section className="w-full max-w-4xl mx-auto px-6 py-16 sm:py-20 relative antialiased bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-500">

      {/* Header Block */}
      <div className="flex flex-col items-center text-center space-y-3 mb-12 sm:mb-16 relative z-10">
        <h3 className="font-black text-xl sm:text-3xl tracking-tight">
          Frequently asked questions
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
          Straight answers about verification, payments, and how accounts work.
        </p>
      </div>

      {/* Accordion List Canvas */}
      <Accordion type="single" collapsible className="w-full space-y-3 relative z-10">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem
            key={idx}
            value={`item-${idx}`}
            className="group/item rounded-xl px-5 sm:px-6 border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 transition-all duration-300 data-[state=open]:border-blue-500/30 data-[state=open]:bg-blue-50/40 dark:data-[state=open]:bg-blue-950/10 overflow-hidden"
          >
            <AccordionTrigger className="text-left font-bold text-sm sm:text-base hover:no-underline py-4.5 sm:py-5 tracking-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors duration-200 data-[state=open]:text-blue-600 dark:data-[state=open]:text-blue-400 [&[data-state=open]>svg]:rotate-180">
              <span className="pr-4 leading-snug">{item.q}</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed pb-5 pr-4 max-w-3xl transition-all duration-300 antialiased font-normal">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

    </section>
  );
}