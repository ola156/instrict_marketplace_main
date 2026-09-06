import Image from "next/image";
import { Bike, Store, User, Mail, Phone } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 transition-colors duration-500">
      <div className="container mx-auto px-6 max-w-6xl py-12 sm:py-16">

        {/* Core Multi-Column Link Network */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-1.5 font-black text-base tracking-tight text-slate-950 dark:text-white">
              <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center">
                <Image src="/logo.svg" alt="Instrict Logo" width={20} height={18} className="object-contain" />
              </div>
              <span>Instrict</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-xs">
              Buy, sell, and get things delivered  all within your campus.
            </p>
            <a
              href="mailto:instrictmarketplace@gmail.com"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Mail className="w-3 h-3" />
              instrictmarketplace@gmail.com
            </a>
                  <a       
                   href="tel:+2348032810928"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Phone className="w-3 h-3" />
              +234 803 281 0928
            </a>

          </div>

          {/* Column: Join Us */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-950 dark:text-white">Join Us</h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <li><a href="/auth/vendor" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"><Store className="w-3 h-3" />Vendor sign up</a></li>
              <li><a href="/auth/rider" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"><Bike className="w-3 h-3" />Become a rider</a></li>
              <li><a href="/auth/student" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"><User className="w-3 h-3" />Get started</a></li>
            </ul>
          </div>

          {/* Column: Trust & Compliance */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-950 dark:text-white">Trust</h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <li><a href="/Instrict_Terms_of_Service.pdf" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of service</a></li>
              <li><a href="/Instrict_Privacy_Policy.pdf" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy policy</a></li>
            </ul>
          </div>

        </div>

        <hr className="border-slate-100 dark:border-slate-900 my-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div>
            &copy; {new Date().getFullYear()} Instrict Marketplace. Built for students by students.
          </div>
        </div>

      </div>
    </footer>
  );
}