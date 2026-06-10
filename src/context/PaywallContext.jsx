import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getUsageStatus, incrementUsage } from '../services/usageApi';

const PaywallContext = createContext(null);

export function PaywallProvider({ children, userPlan = 'free', onUpgrade }) {
  const [paywallFeature, setPaywallFeature] = useState(null);
  const [paywallUsageInfo, setPaywallUsageInfo] = useState(null);
  const [usage, setUsage] = useState(null);

  const isPro = userPlan === 'pro';

  const refreshUsage = useCallback(async () => {
    try {
      const data = await getUsageStatus();
      if (data) setUsage(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (userPlan) refreshUsage();
  }, [userPlan, refreshUsage]);

  const openPaywall = useCallback((featureName, usageInfo = null) => {
    setPaywallFeature(featureName);
    setPaywallUsageInfo(usageInfo);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallFeature(null);
    setPaywallUsageInfo(null);
  }, []);

  /**
   * Gate a premium feature behind the usage limit.
   * Calls POST /api/usage/increment first. If allowed, invokes `fn`.
   * If limit reached, shows the paywall modal.
   * Returns true if the action was allowed, false if blocked.
   */
  const checkAndProceed = useCallback(async (featureName, fn) => {
    if (isPro) {
      fn?.();
      return true;
    }
    try {
      const result = await incrementUsage(featureName);
      await refreshUsage();
      fn?.();
      return true;
    } catch (err) {
      await refreshUsage();
      const info = err.usageInfo || null;
      setPaywallFeature(featureName);
      setPaywallUsageInfo(info);
      return false;
    }
  }, [isPro, refreshUsage]);

  const requirePro = useCallback((featureName, fn) => {
    if (isPro) {
      fn?.();
    } else {
      setPaywallFeature(featureName);
      setPaywallUsageInfo(null);
    }
  }, [isPro]);

  const getFeatureUsage = useCallback((featureName) => {
    return usage?.features?.[featureName] ?? null;
  }, [usage]);

  return (
    <PaywallContext.Provider value={{
      isPro,
      userPlan,
      usage,
      openPaywall,
      closePaywall,
      paywallFeature,
      paywallUsageInfo,
      requirePro,
      checkAndProceed,
      getFeatureUsage,
      refreshUsage,
      onUpgrade,
    }}>
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error('usePaywall must be inside PaywallProvider');
  return ctx;
}
