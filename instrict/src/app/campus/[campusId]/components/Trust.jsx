'use client';

import { BadgeCheck, ShieldCheck, Bike } from 'lucide-react';

const TRUST_POINTS = [
  {
    icon: BadgeCheck,
    title: "Manually verified accounts",
    desc: "Every student, vendor, and rider is reviewed by campus admins before they can buy, sell, or ride. No anonymous accounts.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow-protected payments",
    desc: "Your payment is held safely until you confirm the order arrived. It's only released to the seller or rider once you're satisfied.",
  },
  {
    icon: Bike,
    title: "Delivery that fits the order",
    desc: "Get it from a dedicated rider, straight from the vendor, or arrange a quick meet-up on campus whatever makes sense for that listing.",
  },
];

export default function TrustSection() {
  return (
    <section className="relative max-w-6xl mx-auto w-full bg-white dark:bg-slate-950 text-slate-950 dark:text-white px-6 py-8 md:py-12 transition-colors duration-500">
      <div className="container mx-auto max-w-7xl">

        <div className="flex items-center gap-3 mb-10">
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-900" />
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Why people trust Instrict
          </span>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-900" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-900">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="p-6 md:p-8 flex flex-col items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <point.icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
                {point.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {point.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}