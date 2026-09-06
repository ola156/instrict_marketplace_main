'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  UtensilsCrossed,
  Wrench,
  ArrowRight,
  CheckCircle2,
  Building2,
  Phone,
  Search,
  X,
  MapPin,
  Clock,
  Truck,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { isValidPhoneNumber } from 'libphonenumber-js';

const FIXED_SERVICE_SUBCATEGORIES = new Set([
  'Printing & Photocopying',
]);

function looksFake(nationalDigits) {
  if (/^(\d)\1+$/.test(nationalDigits)) return true;
  const ascending = '01234567890123456789';
  const descending = '09876543210987654321';
  if (ascending.includes(nationalDigits) || descending.includes(nationalDigits)) return true;
  return false;
}

function validateNigerianPhone(raw) {
  if (!raw) return { valid: false, message: 'Support phone number is required.' };

  const formatted = raw.startsWith('+') ? raw : `+${raw}`;

  let isValidFormat = false;
  try {
    isValidFormat = isValidPhoneNumber(formatted, 'NG');
  } catch {
    isValidFormat = false;
  }

  if (!isValidFormat) {
    return { valid: false, message: 'Enter a valid Nigerian phone number, e.g. +2348012345678.' };
  }

  const digitsOnly = formatted.replace(/\D/g, '');
  const nationalPart = digitsOnly.slice(-10);

  if (looksFake(nationalPart)) {
    return { valid: false, message: "That number doesn't look right — please double check it." };
  }

  return { valid: true, formatted };
}

export default function VendorOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [successComplete, setSuccessComplete] = useState(false);
  const [serverError, setServerError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [campusId, setCampusId] = useState(null);
  const [campusLoading, setCampusLoading] = useState(true);
  const [campusError, setCampusError] = useState('');
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  const [profileData, setProfileData] = useState({
    legalName: '',
    supportPhone: '',
    category: '',
    subCategories: [],
    currentZoneId: '',
    storeAddress: '',
    openingTime: '08:00',
    closingTime: '20:00',
    fulfillmentMethod: 'both',
    description: '',
  });

  const [subCategorySearch, setSubCategorySearch] = useState('');

  useEffect(() => {
    (async () => {
      setCampusLoading(true);
      setZonesLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCampusError('Session expired. Please log in again.');
        setCampusLoading(false);
        setZonesLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('campus')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.campus) {
        setCampusError('Could not find your campus. Please contact support.');
        setCampusLoading(false);
        setZonesLoading(false);
        return;
      }

      const { data: campus, error: campusLookupError } = await supabase
        .from('campuses')
        .select('id, name')
        .eq('slug', profile.campus)
        .maybeSingle();

      if (campusLookupError || !campus) {
        setCampusError(`Couldn't match "${profile.campus}" to a known campus.`);
        setCampusLoading(false);
        setZonesLoading(false);
        return;
      }

      setCampusId(campus.id);
      setCampusLoading(false);

      const { data: zoneList, error: zonesError } = await supabase
        .from('delivery_zones')
        .select('id, name, zone_type')
        .eq('campus_id', campus.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!zonesError) setZones(zoneList || []);
      setZonesLoading(false);
    })();
  }, []);

  const categories = [
    {
      id: 'retail',
      title: 'Retail Store',
      description: 'Physical products, packaged inventories, items, or apparel.',
      icon: ShoppingBag,
      color: 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'canteen',
      title: 'Canteen / Bukka',
      description: 'Cooked food, fast meals, drinks, snacks, and custom student baking.',
      icon: UtensilsCrossed,
      color: 'border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'service',
      title: 'Campus Service',
      description: 'Logistics, academic helpers, freelance, maintenance, or repairs.',
      icon: Wrench,
      color: 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    },
  ];

  const subCategoryDirectory = {
    retail: [
      'Gadgets & Tech Accessories', 'Thrift & Fashion Clothes',
      'Footwear & Sneakers', 'Groceries & Provisions', 'Stationery & Textbooks',
      'Cosmetics & Skincare', 'Beddings & Room Decor', 'Perfumes & Oils'
    ],
    canteen: [
      'Swallow & Native Soups', 'Rice & Fast Food Chains', 'Pastries & Bakers',
      'Smoothies & Ice Creams', 'Healthy Meals & Salads', 'Grills, Shawarma & Suya',
      'Breakfast Hubs', 'Soft Drinks & Mocktails'
    ],
    service: [
      'Academic Tutor', 'Printing & Photocopying', 'Graphic Designer',
      'UI/UX & Web Developer', 'Laundry & Dry Cleaning', 'Logistics & Campus Errands',
      'Hairstylist & Barbering', 'Gadget Repair & Software Flashing', 'Photography & Videography'
    ]
  };

  const recommendedOptions = useMemo(() => {
    if (!profileData.category) return [];
    const pool = subCategoryDirectory[profileData.category] || [];

    const filtered = pool.filter(item =>
      item.toLowerCase().includes(subCategorySearch.toLowerCase()) &&
      !profileData.subCategories.includes(item)
    );

    if (subCategorySearch.trim() && !pool.some(i => i.toLowerCase() === subCategorySearch.trim().toLowerCase()) && !profileData.subCategories.includes(subCategorySearch.trim())) {
      filtered.push(`Add "${subCategorySearch.trim()}"`);
    }

    return filtered;
  }, [profileData.category, profileData.subCategories, subCategorySearch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (name === 'supportPhone') setPhoneError('');
  };

  const selectCategory = (id) => {
    setProfileData(prev => ({ ...prev, category: id, subCategories: [] }));
    setSubCategorySearch('');
  };

  const addSubCategory = (item) => {
    let cleanItem = item;
    if (item.startsWith('Add "') && item.endsWith('"')) {
      cleanItem = item.substring(5, item.length - 1);
    }
    setProfileData(prev => ({ ...prev, subCategories: [...prev.subCategories, cleanItem] }));
    setSubCategorySearch('');
  };

  const removeSubCategory = (target) => {
    setProfileData(prev => ({ ...prev, subCategories: prev.subCategories.filter(item => item !== target) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setPhoneError('');

    if (!profileData.category || profileData.subCategories.length === 0) return;
    if (!campusId) {
      setServerError('Your campus could not be determined. Please contact support.');
      return;
    }
    if (!profileData.currentZoneId) {
      setServerError('Please select your current zone.');
      return;
    }

    const phoneCheck = validateNigerianPhone(profileData.supportPhone);
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.message);
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setServerError('Your session expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      let serviceSubtype = null;
      if (profileData.category === 'service') {
        const allFixed = profileData.subCategories.every(sub =>
          FIXED_SERVICE_SUBCATEGORIES.has(sub)
        );
        serviceSubtype = allFixed ? 'fixed' : 'variable';
      }

      const selectedZone = zones.find((z) => z.id === profileData.currentZoneId);

      const { error: upsertError } = await supabase
        .from('vendor_profiles')
        .upsert({
          user_id: user.id,
          legal_name: profileData.legalName,
          support_phone: phoneCheck.formatted,
          category: profileData.category,
          sub_categories: profileData.subCategories,
          campus_id: campusId,
          current_zone_id: profileData.currentZoneId,
          store_address: profileData.storeAddress,
          landmark: selectedZone?.name || null,
          opening_time: profileData.openingTime,
          closing_time: profileData.closingTime,
          fulfillment_method: profileData.fulfillmentMethod,
          description: profileData.description,
          phone_verified: true, // format-checked only, not OTP-confirmed — for now
          ...(serviceSubtype && { service_subtype: serviceSubtype }),
        });

      if (upsertError) {
        setServerError(upsertError.message);
        setIsLoading(false);
        return;
      }

      setSuccessComplete(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setServerError('Something went wrong saving your details. Please try again.');
      setIsLoading(false);
    }
  };

  if (successComplete) {
    return (
      <main className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Onboarding Complete</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Your terminal configuration variables are saved. Establishing routing gateways and opening your portal dashboard.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white antialiased">

      <section className="hidden md:flex flex-[0.5] lg:flex-[0.6] p-12 flex-col justify-between text-white bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-blue-400">Marketplace.</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
              Merchant Core Launch
            </span>
            <h1 className="text-2xl lg:text-3xl font-black leading-[1.15] tracking-tight">
              Initialize Your <br />Storefront Assets
            </h1>
          </div>
        </div>
        <div className="relative z-10 text-[10px] text-white/30 font-medium">
          Instrict Commerce Engine Node v2.4
        </div>
      </section>

      <section className="flex-1 flex justify-center p-6 sm:p-10 md:p-12 lg:p-14 bg-white dark:bg-slate-950 overflow-y-auto relative">
        <div className="w-full max-w-2xl space-y-6 my-auto">

          <div className="flex items-center justify-between md:hidden border-b border-slate-100 dark:border-slate-900 pb-4">
            <span className="text-xs font-black tracking-tighter uppercase">Instrict Marketplace</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-md font-black tracking-tight">Business Configuration Parameters</h2>
              <p className="text-xs text-slate-400 mt-0.5">Furnish your exact logistical and structural operating parameters below.</p>
            </div>

            {campusError && (
              <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                <p className="text-[11px] font-bold text-rose-500 leading-relaxed">{campusError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Registered Trading Name <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="legalName"
                    value={profileData.legalName}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Subomi Foods Ltd"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Support / Order Hotline <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    name="supportPhone"
                    value={profileData.supportPhone}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. +234 812 345 6789"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                {phoneError && (
                  <p className="text-[10px] text-rose-500 font-bold">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-50 dark:border-slate-900/50 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Address <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="storeAddress"
                    value={profileData.storeAddress}
                    onChange={handleInputChange}
                    required
                    placeholder="Shop 4, SUB Commercial Complex"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Zone / Closest LandMark <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    name="currentZoneId"
                    value={profileData.currentZoneId}
                    onChange={handleInputChange}
                    required
                    disabled={zonesLoading || !campusId}
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">
                      {zonesLoading ? 'Loading zones...' : 'Select your zone'}
                    </option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400">
                  Doubles as your closest landmark — you can update this anytime if you move.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-50 dark:border-slate-900/50 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Opening Hour <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    name="openingTime"
                    value={profileData.openingTime}
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Closing Hour <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    name="closingTime"
                    value={profileData.closingTime}
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Fulfillment Channel <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    name="fulfillmentMethod"
                    value={profileData.fulfillmentMethod}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="pickup">Store Pickup Only</option>
                    <option value="delivery">Campus Delivery Only</option>
                    <option value="both">Both (Pickup & Delivery)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-50 dark:border-slate-900/50 pt-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Select Storefront Category Cluster <span className="text-blue-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = profileData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat.id)}
                      className={`w-full p-3 rounded-xl border text-left flex gap-4 transition-all duration-200 group relative overflow-hidden ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black tracking-tight">{cat.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-normal max-w-md">{cat.description}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {profileData.category && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-900 pt-4 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Specify Business Offerings / Sub-Categories <span className="text-blue-500">*</span>
                </label>

                {profileData.subCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900">
                    {profileData.subCategories.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 text-white font-bold text-[10px] tracking-tight shadow-sm"
                      >
                        {item}
                        <button type="button" onClick={() => removeSubCategory(item)} className="p-0.5 hover:bg-white/20 rounded-md transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={subCategorySearch}
                    onChange={(e) => setSubCategorySearch(e.target.value)}
                    placeholder="Type to search e.g. Gadgets, Swallows, Laundry..."
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {subCategorySearch.trim().length > 0 && recommendedOptions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-900 rounded-xl bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-50 dark:divide-slate-900/50 z-20 relative">
                    {recommendedOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => addSubCategory(item)}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 block transition-colors text-slate-700 dark:text-slate-300"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 border-t border-slate-50 dark:border-slate-900/50 pt-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Short Business Description / Bio
              </label>
              <textarea
                name="description"
                value={profileData.description}
                onChange={handleInputChange}
                rows={2}
                placeholder="Tell students what items or services you provide on campus..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {serverError && (
              <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                <p className="text-[11px] font-bold text-rose-500 leading-relaxed">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || campusLoading || !profileData.category || profileData.subCategories.length === 0 || !profileData.storeAddress || !profileData.currentZoneId}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
            >
              {isLoading ? 'Processing parameters...' : 'Activate Storefront'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}