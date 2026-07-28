'use client';
import { useParams } from 'next/navigation';
import Header from './components/Header';
import HeroSection from './components/Hero';
import MarketplaceEngine from './components/Marketplace';
import CampusServices from './components/Services';
import SplitScrollMatrixHub from './components/ServiceHub';
import CampusPulse from './components/CampusPulse';
import CampusFeedMasonry from './components/CampusFeed';
import CampusErrandFeed from './components/MicroService2';
import WorkflowSwitcher from './components/Cta';
import { LandingHelpCenter } from './components/Help';
import { LandingFooter } from './components/Footer';

export default function CampusLandingPage() {
  const { campusId } = useParams(); // This will be 'unilag', 'oau', etc.

  // You can now use campusId to fetch specific content
  return (
    <main className="w-full min-h-screen bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-500">
<Header/>
<HeroSection/>
<WorkflowSwitcher/>
<LandingHelpCenter/>
<LandingFooter/>
    </main>
  );
}