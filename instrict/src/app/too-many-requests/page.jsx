// app/too-many-requests/page.jsx
export default function TooManyRequests() {
  return (
    <main className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">🚦</span>
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Slow down
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          You've made too many requests in a short period. Please wait a few minutes before trying again.
        </p>
        <a
          href="/"
          className="inline-block mt-2 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black tracking-tight transition-all leading-10"
        >
          Go back home
        </a>
      </div>
    </main>
  );
}