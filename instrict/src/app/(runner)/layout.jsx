// app/(runner)/layout.js
import { RunnerProvider } from './context/RunnerProvider';
import RunnerSidebar from './components/RunnerSidebar';
import RunnerBottomNav from './components/RunnerBottomNav';
import RunnerMobileTopBar from './components/RunnerMobileTopBar';
import RunnerVerificationBanner from './components/RunnerVerificationBanner';
import RunnerMainContent from './components/RunnerMainContent';

export default function RunnerLayout({ children }) {
  return (
    <RunnerProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <RunnerSidebar />
        <div className="flex-1 pb-16 md:pb-0">
          <RunnerMobileTopBar />
          <RunnerVerificationBanner />
          <RunnerMainContent>{children}</RunnerMainContent>
        </div>
        <RunnerBottomNav />
      </div>
    </RunnerProvider>
  );
}