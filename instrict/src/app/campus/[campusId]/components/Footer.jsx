import { Bike, Shield, Store, Activity, User } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="w-full bg-background border-t border-border/60 ">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl py-12 sm:py-16">
        
        {/* Core Multi-Column Link Network */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-1.5 font-black text-base tracking-tighter text-foreground">
              <span className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">I</span>
              <span>Instrict</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
              The hyper-local campus engine matching secure peer logistics, canteen checkout pipelines, and student commerce hubs.
            </p>
          </div>

         

          {/* Column 3: Partner Portals */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Join Us</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><a href="/auth/vendor" className="hover:text-blue-500 transition-colors inline-flex items-center gap-1"><Store className="w-3 h-3" />Vendor SignUp</a></li>
              <li><a href="/auth/rider" className="hover:text-blue-500 transition-colors inline-flex items-center gap-1"><Bike className="w-3 h-3" /> Become a Rider</a></li>
              <li><a href="/auth/student" className="hover:text-blue-500 transition-colors inline-flex items-center gap-1"><User className="w-3 h-3" />Get Started</a></li>
            </ul>
          </div>

          {/* Column 4: Trust & Compliance */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Trust </h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
              <li><a href="/security" className="hover:text-blue-500 transition-colors inline-flex items-center gap-1">Safety Protocols</a></li>
              <li><a href="/terms" className="hover:text-blue-500 transition-colors">Terms of services</a></li>
              <li><a href="/privacy" className="hover:text-blue-500 transition-colors">Privacy policy</a></li>
            </ul>
          </div>

        </div>

        <hr className="border-border/40 my-6" />

        {/* Bottom Metadata Bar with Network Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground font-medium">
          <div>
            &copy; {new Date().getFullYear()} Instrict Network. Built for campus efficiency.
          </div>

        
        </div>

      </div>
    </footer>
  );
}