'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Wallet, TrendingUp, Clock, ArrowDownLeft, Building2, CreditCard,
  User, Save, CheckCircle2, AlertCircle, Ban, ShieldCheck, Loader2,
} from 'lucide-react';

const inputClass = "w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all";

// Business rules — enforced here for UX, but MUST also be enforced inside
// the `request_vendor_withdrawal` RPC itself, since anyone can call that
// RPC directly and skip this UI entirely.
const MIN_PAYOUT = 5000;
// Platform commission taken from the vendor's own subtotal on every paid
// order, before crediting their wallet. Must match whatever percentage is
// actually applied inside the `credit_vendor_on_payment` trigger — this
// constant is for display only and doesn't move any money itself.
const PLATFORM_COMMISSION_PERCENT = 5;

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TransactionRow({ order }) {
  const gross = Number(order.subtotal);
  // Display-only estimate of what actually landed in the wallet after the
  // platform commission. The real number of truth is whatever
  // `credit_vendor_on_payment` actually credited — this is just showing
  // the vendor the same math up front so the wallet total isn't a surprise.
  const net = gross * (1 - PLATFORM_COMMISSION_PERCENT / 100);

  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
          <ArrowDownLeft className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[11px] text-slate-400">
            {new Date(order.created_at).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
          +₦{net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
        <p className="text-[10px] text-slate-400">
          ₦{gross.toLocaleString()} − {PLATFORM_COMMISSION_PERCENT}% fee
        </p>
      </div>
    </div>
  );
}

export default function VendorWallet({ vendor, isSuspended = false }) {
  const supabase = createClient();
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Bank details + Paystack verification ──
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankForm, setBankForm] = useState({ bank_name: '', bank_code: '', account_number: '', account_name: '' });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');
  const [payoutIsError, setPayoutIsError] = useState(false);
  const [requestedToday, setRequestedToday] = useState(false);

  useEffect(() => {
    if (!vendor?.user_id) return;

    fetchData();

    // Keep balance/history live as orders get paid or refunded, instead of
    // only reflecting reality on page load.
    const channel = supabase
      .channel(`vendor-wallet-${vendor.user_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `vendor_id=eq.${vendor.user_id}`,
      }, fetchData)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendor_wallet',
        filter: `vendor_id=eq.${vendor.user_id}`,
      }, fetchData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [vendor?.user_id]);

  useEffect(() => {
    // Bank list is static-ish (rarely changes) — fetch once, not per vendor.
    fetch('/api/paystack/banks')
      .then((r) => r.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, []);

  const fetchData = async () => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [{ data: walletData }, { data: ordersData }, { count: todaysRequests }] = await Promise.all([
      supabase.from('vendor_wallet').select('*').eq('vendor_id', vendor.user_id).single(),
      supabase
        .from('orders')
        .select('id, subtotal, payment_status, created_at, status')
        .eq('vendor_id', vendor.user_id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50),
      // Once-per-day check against real withdrawal requests, not a
      // client-trusted timestamp — any status counts (pending/paid/rejected
      // all still used up today's request).
      supabase
        .from('vendor_withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.user_id)
        .gte('created_at', todayStart.toISOString()),
    ]);

    setRequestedToday((todaysRequests || 0) > 0);

    if (walletData) {
      setWallet(walletData);
      setBankForm({
        bank_name: walletData.bank_name || '',
        bank_code: walletData.bank_code || '',
        account_number: walletData.account_number || '',
        account_name: walletData.account_name || '',
      });
      // Existing saved details are trusted (they were verified when saved).
      setVerified(!!walletData.account_name);
    }
    setOrders(ordersData || []);
    setLoading(false);
  };

  const onBankChange = (e) => {
    const code = e.target.value;
    const bank = banks.find((b) => b.code === code);
    setBankForm((p) => ({ ...p, bank_code: code, bank_name: bank?.name || '', account_name: '' }));
    setVerified(false);
    setVerifyError('');
  };

  const onAccountNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setBankForm((p) => ({ ...p, account_number: digits, account_name: '' }));
    setVerified(false);
    setVerifyError('');
  };

  const verifyAccount = async () => {
    if (!bankForm.bank_code || bankForm.account_number.length !== 10) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/paystack/resolve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: bankForm.account_number, bank_code: bankForm.bank_code }),
      });
      const data = await res.json();
      if (!res.ok || !data.account_name) {
        setVerifyError(data.error || "Couldn't verify this account. Double-check the number and bank.");
        setVerified(false);
        return;
      }
      setBankForm((p) => ({ ...p, account_name: data.account_name }));
      setVerified(true);
    } catch (err) {
      setVerifyError('Verification failed — check your connection and try again.');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const saveBank = async () => {
    // Defense in depth: block the write even if a stale UI left the form enabled.
    if (isSuspended) { setBankError('Your store is suspended. Contact support to update bank details.'); return; }
    if (!bankForm.bank_code || !bankForm.account_number || !bankForm.account_name) {
      setBankError('All bank fields are required.');
      return;
    }
    if (!verified) {
      setBankError('Verify the account with Paystack before saving.');
      return;
    }
    setBankError('');
    setSavingBank(true);

    const { error } = await supabase
      .from('vendor_wallet')
      .update({
        bank_name: bankForm.bank_name,
        bank_code: bankForm.bank_code,
        account_number: bankForm.account_number,
        account_name: bankForm.account_name,
        updated_at: new Date().toISOString(),
      })
      .eq('vendor_id', vendor.user_id);

    setSavingBank(false);
    if (error) { setBankError(error.message); return; }
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 3000);
    fetchData();
  };

  // ── Payout gating ──
  // NOTE: these are UX-only guards. The actual limits (minimum amount,
  // once per day) must also live inside `request_vendor_withdrawal` in
  // Postgres — otherwise anyone can call the RPC directly and skip this
  // entirely. This requires a timestamp column on vendor_wallet (e.g.
  // `last_withdrawal_requested_at`) that the RPC sets on each successful
  // request, since I don't yet know if that column exists.
  const balance = Number(wallet?.balance || 0);
  const belowMinimum = balance < MIN_PAYOUT;
  const payoutBlockedReason = requestedToday
    ? 'You can only request one withdrawal per day — try again tomorrow.'
    : belowMinimum
    ? `You need at least ₦${MIN_PAYOUT.toLocaleString()} available to withdraw.`
    : null;

  const requestPayout = async () => {
    setPayoutMsg('');
    setPayoutIsError(false);

    if (isSuspended) {
      setPayoutMsg('Your store is suspended. Contact support to request a withdrawal.');
      setPayoutIsError(true);
      return;
    }
    if (payoutBlockedReason) {
      setPayoutMsg(payoutBlockedReason);
      setPayoutIsError(true);
      return;
    }

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setPayoutMsg('Enter a valid amount.');
      setPayoutIsError(true);
      return;
    }
    if (amount < MIN_PAYOUT) {
      setPayoutMsg(`Minimum withdrawal is ₦${MIN_PAYOUT.toLocaleString()}.`);
      setPayoutIsError(true);
      return;
    }
    if (!wallet?.bank_name) {
      setPayoutMsg('Please save your bank details first.');
      setPayoutIsError(true);
      return;
    }
    if (amount > balance) {
      setPayoutMsg('That is more than your available balance.');
      setPayoutIsError(true);
      return;
    }

    setRequestingPayout(true);
    const { error } = await supabase.rpc('request_vendor_withdrawal', { p_amount: amount });
    setRequestingPayout(false);

    if (error) {
      setPayoutMsg(error.message || 'Something went wrong requesting this withdrawal.');
      setPayoutIsError(true);
      return;
    }

    setPayoutMsg('Withdrawal requested — an admin will process it shortly.');
    setPayoutIsError(false);
    setWithdrawAmount('');
    fetchData();
  };

  const totalEarned = Number(wallet?.total_earned || 0);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Wallet & Payouts</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Your earnings, balance, and bank details</p>
        </div>
        {isSuspended && (
          <div className="h-9 px-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-1.5 shrink-0">
            <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-[11px] font-black text-rose-500">Suspended</span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3.5">
        <Wallet className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
          Instrict takes a {PLATFORM_COMMISSION_PERCENT}% platform fee from every completed order before it's credited to your wallet.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Available balance"
          value={`₦${balance.toLocaleString()}`}
          sub="Ready to withdraw"
          icon={Wallet}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="Total earned"
          value={`₦${totalEarned.toLocaleString()}`}
          sub="Your item sales only"
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Pending payout"
          value={`₦${Number(wallet?.pending_payout || 0).toLocaleString()}`}
          sub="Being processed"
          icon={Clock}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="space-y-5">
          {/* Bank details */}
          <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden ${isSuspended ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Bank Details</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Where your payouts will be sent</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bank</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                  <select
                    value={bankForm.bank_code}
                    onChange={onBankChange}
                    disabled={isSuspended || banksLoading}
                    className={`${inputClass} pl-9 appearance-none`}
                  >
                    <option value="">{banksLoading ? 'Loading banks…' : 'Select your bank'}</option>
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={bankForm.account_number}
                    onChange={onAccountNumberChange}
                    placeholder="0123456789"
                    inputMode="numeric"
                    maxLength={10}
                    className={`${inputClass} pl-9`}
                    disabled={isSuspended}
                  />
                </div>
              </div>

              {/* Verify button — separate step so we never write an
                  unverified name to the DB. */}
              {!verified && (
                <button
                  onClick={verifyAccount}
                  disabled={isSuspended || verifying || !bankForm.bank_code || bankForm.account_number.length !== 10}
                  className="w-full h-9 rounded-xl text-xs font-black tracking-tight bg-slate-900 dark:bg-slate-700 text-white disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Verifying with Paystack…</>
                  ) : (
                    <><ShieldCheck className="w-3.5 h-3.5" />Verify account</>
                  )}
                </button>
              )}

              {verifyError && <p className="text-[11px] font-bold text-rose-500">{verifyError}</p>}

              {verified && bankForm.account_name && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Verified account name</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{bankForm.account_name}</p>
                  </div>
                </div>
              )}

              {bankError && <p className="text-[11px] font-bold text-rose-500">{bankError}</p>}

              <button
                onClick={saveBank}
                disabled={savingBank || isSuspended || !verified}
                className={`w-full h-9 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-2 ${
                  bankSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                }`}
              >
                {savingBank ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : bankSaved ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" />Saved</>
                ) : (
                  <><Save className="w-3.5 h-3.5" />Save bank details</>
                )}
              </button>
            </div>
          </div>

          {/* Request payout */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Request Payout</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Minimum ₦{MIN_PAYOUT.toLocaleString()} · once per day · funds held until an admin processes it
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    ₦{balance.toLocaleString()}
                  </p>
                </div>
                {wallet?.bank_name && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-medium">{wallet.bank_name}</p>
                    <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">{wallet.account_number}</p>
                  </div>
                )}
              </div>

              {payoutBlockedReason && !isSuspended && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{payoutBlockedReason}</p>
                </div>
              )}

              <div className={`flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 ${isSuspended || payoutBlockedReason ? 'opacity-50' : ''}`}>
                <span className="text-xs font-black text-slate-400">₦</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN_PAYOUT}
                  placeholder={`Amount to withdraw (min ₦${MIN_PAYOUT.toLocaleString()})`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={isSuspended || !!payoutBlockedReason}
                  className="w-full h-11 bg-transparent outline-none text-xs font-bold"
                />
              </div>

              {payoutMsg && (
                <div className={`flex items-start gap-2 rounded-xl px-4 py-3 ${
                  payoutIsError ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-emerald-500/5 border border-emerald-500/20'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${payoutIsError ? 'text-amber-500' : 'text-emerald-500'}`} />
                  <p className={`text-[11px] font-bold ${payoutIsError ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {payoutMsg}
                  </p>
                </div>
              )}

              <button
                onClick={requestPayout}
                disabled={requestingPayout || isSuspended || !!payoutBlockedReason}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black tracking-tight transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20"
              >
                {requestingPayout ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Requesting...</>
                ) : (
                  <><ArrowDownLeft className="w-4 h-4" />Request withdrawal</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Transaction history — derived from paid orders, subtotal only.
            Read-only, so it stays visible and unblocked while suspended. */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Earnings History</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{orders.length} paid orders</p>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs font-black text-slate-400">No earnings yet</p>
              <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Paid orders will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800 overflow-y-auto max-h-[520px]">
              {orders.map(order => <TransactionRow key={order.id} order={order} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}