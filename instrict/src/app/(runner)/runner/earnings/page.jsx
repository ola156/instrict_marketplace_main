'use client';

// Balance/total_earned/pending_payout are read-only from the client —
// they only ever change via the credit triggers (order delivered /
// errand completed) and request_rider_withdrawal(). bank_name /
// bank_code / account_number / account_name ARE directly editable by the
// rider, enforced by a column-level GRANT on rider_wallets rather than a
// client-side convention, so this can't be spoofed either way.
//
// Bank details now go through the same Paystack account-verify step as
// the vendor wallet: pick bank -> enter account number -> "Verify" hits
// /api/paystack/resolve-account -> only a verified account_name can be
// saved. This prevents riders from typo-ing an account number and never
// noticing until a real payout bounces.
//
// Withdrawal requests are shown in their own list (status: pending ->
// paid/rejected), separate from the earnings ledger below, so a single
// request is never rendered twice.

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRunner } from '../../context/RunnerProvider';
import {
  Wallet, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, Banknote, Landmark, Save, Clock3,
  ShieldCheck, CheckCircle2, XCircle, HourglassIcon, AlertCircle,
} from 'lucide-react';

const cardClass = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4";
const inputClass = "w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500";
const labelClass = "text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block";

const MIN_PAYOUT = 5000;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const TYPE_LABEL = {
  order_earning: 'Delivery earning',
  errand_earning: 'Errand reward',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
};

const WITHDRAWAL_STATUS = {
  pending: { label: 'Pending', className: 'text-amber-500 bg-amber-500/10', icon: HourglassIcon },
  paid: { label: 'Paid', className: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
  rejected: { label: 'Rejected', className: 'text-rose-500 bg-rose-500/10', icon: XCircle },
};

export default function RunnerWallet() {
  const supabase = createClient();
  const { runner } = useRunner();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [requestedToday, setRequestedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  // ── Bank details + Paystack verification ──
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankForm, setBankForm] = useState({ bank_name: '', bank_code: '', account_number: '', account_name: '' });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankSaved, setBankSaved] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!runner) return;
    setLoading(true);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [
      { data: walletData, error: walletErr },
      { data: txData, error: txErr },
      { data: withdrawalData, error: withdrawalErr },
      { count: todaysRequests },
    ] = await Promise.all([
      supabase
        .from('rider_wallets')
        .select('rider_id, balance, total_earned, pending_payout, bank_name, bank_code, account_number, account_name, updated_at')
        .eq('rider_id', runner.user_id)
        .maybeSingle(),
      supabase
        .from('rider_wallet_transactions')
        .select('id, amount, type, source_type, description, created_at')
        .eq('rider_id', runner.user_id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('rider_withdrawal_requests')
        .select('id, amount, status, created_at, processed_at, rejection_reason')
        .eq('rider_id', runner.user_id)
        .order('created_at', { ascending: false })
        .limit(20),
      // Once-per-day check against real requests, not a client-trusted
      // timestamp — any status (pending/paid/rejected) still used up today.
      supabase
        .from('rider_withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', runner.user_id)
        .gte('created_at', todayStart.toISOString()),
    ]);

    if (walletErr) console.error('Wallet fetch error:', walletErr);
    if (txErr) console.error('Wallet transactions fetch error:', txErr);
    if (withdrawalErr) console.error('Withdrawal requests fetch error:', withdrawalErr);

    const w = walletData || { balance: 0, total_earned: 0, pending_payout: 0 };
    setWallet(w);
    setBankForm({
      bank_name: w.bank_name || '',
      bank_code: w.bank_code || '',
      account_number: w.account_number || '',
      account_name: w.account_name || '',
    });
    // Existing saved details are trusted (they were verified when saved).
    setVerified(!!w.account_name);
    setTransactions(txData || []);
    setWithdrawals(withdrawalData || []);
    setRequestedToday((todaysRequests || 0) > 0);
    setLoading(false);
  }, [runner, supabase]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((r) => r.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, []);

  // Realtime: refresh the moment a job completion credits the wallet, or
  // an admin processes a withdrawal request.
  useEffect(() => {
    if (!runner) return;
    const channel = supabase
      .channel('runner-wallet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_wallets', filter: `rider_id=eq.${runner.user_id}` }, () => fetchWallet())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_wallet_transactions', filter: `rider_id=eq.${runner.user_id}` }, () => fetchWallet())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_withdrawal_requests', filter: `rider_id=eq.${runner.user_id}` }, () => fetchWallet())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [runner, fetchWallet, supabase]);

  const onBankChange = (e) => {
    const code = e.target.value;
    const bank = banks.find((b) => b.code === code);
    setBankForm((p) => ({ ...p, bank_code: code, bank_name: bank?.name || '', account_name: '' }));
    setVerified(false);
    setVerifyError('');
    setBankSaved(false);
  };

  const onAccountNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setBankForm((p) => ({ ...p, account_number: digits, account_name: '' }));
    setVerified(false);
    setVerifyError('');
    setBankSaved(false);
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

  const saveBankDetails = async () => {
    if (!verified) {
      setBankError('Verify the account with Paystack before saving.');
      return;
    }
    setSavingBank(true);
    setBankError('');
    setBankSaved(false);

    const { error } = await supabase
      .from('rider_wallets')
      .update({
        bank_name: bankForm.bank_name,
        bank_code: bankForm.bank_code,
        account_number: bankForm.account_number,
        account_name: bankForm.account_name,
      })
      .eq('rider_id', runner.user_id);

    setSavingBank(false);

    if (error) {
      setBankError('Could not save your bank details. Try again.');
      return;
    }
    setBankSaved(true);
    fetchWallet();
  };

  const balance = Number(wallet?.balance || 0);
  const belowMinimum = balance < MIN_PAYOUT;
  const payoutBlockedReason = requestedToday
    ? 'You can only request one withdrawal per day — try again tomorrow.'
    : belowMinimum
    ? `You need at least ₦${MIN_PAYOUT.toLocaleString()} available to withdraw.`
    : null;

  const requestWithdrawal = async () => {
    setWithdrawError('');
    setWithdrawSuccess('');

    if (payoutBlockedReason) {
      setWithdrawError(payoutBlockedReason);
      return;
    }

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawError('Enter a valid amount.');
      return;
    }
    if (amount < MIN_PAYOUT) {
      setWithdrawError(`Minimum withdrawal is ₦${MIN_PAYOUT.toLocaleString()}.`);
      return;
    }
    if (wallet && amount > Number(wallet.balance)) {
      setWithdrawError('That is more than your available balance.');
      return;
    }
    if (!wallet?.bank_name || !wallet?.account_number || !wallet?.account_name) {
      setWithdrawError('Add your bank details below before requesting a withdrawal.');
      return;
    }

    setWithdrawing(true);
    const { error } = await supabase.rpc('request_rider_withdrawal', { p_amount: amount });
    setWithdrawing(false);

    if (error) {
      setWithdrawError(
        error.message?.includes('Insufficient')
          ? 'Insufficient balance.'
          : error.message?.includes('bank details')
          ? 'Add your bank details below before requesting a withdrawal.'
          : error.message?.includes('once')
          ? 'You can only request one withdrawal per day — try again tomorrow.'
          : 'Something went wrong requesting this withdrawal.'
      );
      return;
    }

    setWithdrawSuccess('Withdrawal requested — it will be paid out shortly.');
    setWithdrawAmount('');
    fetchWallet();
  };

  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 pb-10">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-5 py-4">
        <h1 className="text-sm font-black tracking-tight">Wallet</h1>
        <p className="text-[11px] text-slate-400">Your earnings and payouts</p>
      </div>

      <div className="px-5 py-4 max-w-lg md:max-w-3xl mx-auto space-y-4">
        {/* Balance + earnings summary */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-100">Available balance</p>
            <button onClick={fetchWallet} className="text-blue-100 hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-2xl font-black tracking-tight mt-1">
            {loading && !wallet ? <Loader2 className="w-5 h-5 animate-spin" /> : `₦${balance.toLocaleString()}`}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/15">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-100">Total earned</p>
              <p className="text-sm font-black">₦{Number(wallet?.total_earned || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-100 flex items-center gap-1">
                <Clock3 className="w-2.5 h-2.5" /> Pending payout
              </p>
              <p className="text-sm font-black">₦{Number(wallet?.pending_payout || 0).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-[9px] font-bold text-blue-100/70 mt-3 pt-3 border-t border-white/10">
  Earnings shown already reflect the platform fee — 5% on deliveries, 3% on errands.
</p>
        </div>

        {/* Bank details */}
        <div className={cardClass}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-tight">Payout bank details</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Where your withdrawals get sent.</p>
            </div>
          </div>

          {bankError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 mb-3">
              <p className="text-[11px] font-bold text-rose-500">{bankError}</p>
            </div>
          )}
          {bankSaved && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 mb-3">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Bank details saved.</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Bank</label>
              <select
                value={bankForm.bank_code}
                onChange={onBankChange}
                disabled={banksLoading}
                className={`${inputClass} appearance-none`}
              >
                <option value="">{banksLoading ? 'Loading banks…' : 'Select your bank'}</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Account number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={bankForm.account_number}
                onChange={onAccountNumberChange}
                className={inputClass}
                placeholder="0123456789"
              />
            </div>

            {!verified && (
              <button
                onClick={verifyAccount}
                disabled={verifying || !bankForm.bank_code || bankForm.account_number.length !== 10}
                className="w-full h-11 rounded-xl bg-slate-900 dark:bg-slate-700 hover:opacity-90 disabled:opacity-40 text-white font-black text-xs tracking-tight transition-all flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {verifying ? 'Verifying with Paystack…' : 'Verify account'}
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

            <button
              onClick={saveBankDetails}
              disabled={savingBank || !verified}
              className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-50 text-white dark:text-slate-900 font-black text-xs tracking-tight transition-all flex items-center justify-center gap-2"
            >
              {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingBank ? 'Saving...' : 'Save bank details'}
            </button>
          </div>
        </div>

        {/* Request withdrawal */}
        <div className={cardClass}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-tight">Request withdrawal</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Minimum ₦{MIN_PAYOUT.toLocaleString()} · once per day · funds held until an admin processes it.
              </p>
            </div>
          </div>

          {payoutBlockedReason && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{payoutBlockedReason}</p>
            </div>
          )}
          {withdrawError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 mb-3">
              <p className="text-[11px] font-bold text-rose-500">{withdrawError}</p>
            </div>
          )}
          {withdrawSuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 mb-3">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{withdrawSuccess}</p>
            </div>
          )}

          <div className="flex gap-2">
            <div className={`flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 ${payoutBlockedReason ? 'opacity-50' : ''}`}>
              <span className="text-xs font-black text-slate-400">₦</span>
              <input
                type="number"
                inputMode="decimal"
                min={MIN_PAYOUT}
                placeholder={`0.00 (min ₦${MIN_PAYOUT.toLocaleString()})`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!!payoutBlockedReason}
                className="w-full h-11 bg-transparent outline-none text-xs font-bold"
              />
            </div>
            <button
              onClick={requestWithdrawal}
              disabled={withdrawing || !!payoutBlockedReason}
              className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs tracking-tight transition-all whitespace-nowrap"
            >
              {withdrawing ? 'Requesting...' : 'Withdraw'}
            </button>
          </div>
        </div>

        {/* Withdrawal requests — separate list from the earnings ledger
            below, so a single request is never shown twice. Status badge
            updates in place (pending -> paid/rejected) via realtime. */}
        {withdrawals.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Withdrawal requests</p>
            <div className="space-y-2">
              {withdrawals.map((req) => {
                const style = WITHDRAWAL_STATUS[req.status] || WITHDRAWAL_STATUS.pending;
                const StatusIcon = style.icon;
                return (
                  <div key={req.id} className={`${cardClass} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-500">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Withdrawal request</p>
                        <p className="text-[10px] text-slate-400">{formatDate(req.created_at)}</p>
                        {req.status === 'rejected' && req.rejection_reason && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{req.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs font-black">₦{Number(req.amount).toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${style.className}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {style.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction ledger — earnings/adjustments only */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Recent activity</p>

          {loading && transactions.length === 0 && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="text-center py-10 space-y-1">
              <Wallet className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-[11px] font-bold text-slate-400">No transactions yet</p>
            </div>
          )}

          <div className="space-y-2">
            {transactions.map((tx) => {
              const isCredit = Number(tx.amount) > 0;
              return (
                <div key={tx.id} className={`${cardClass} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {isCredit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{tx.description || TYPE_LABEL[tx.type] || tx.type}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <p className={`text-xs font-black ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {isCredit ? '+' : ''}₦{Number(tx.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}