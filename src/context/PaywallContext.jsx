import { createContext, useContext, useState, useCallback } from 'react';

const PaywallContext = createContext(null);

export function PaywallProvider({ children, userPlan = 'free', onUpgrade }) {
  const [paywallFeature, setPaywallFeature] = useState(null);

  const openPaywall = useCallback((featureName) => {
    setPaywallFeature(featureName);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallFeature(null);
  }, []);

  const isPro = userPlan === 'pro';

  const requirePro = useCallback((featureName, fn) => {
    if (isPro) {
      fn?.();
    } else {
      setPaywallFeature(featureName);
    }
  }, [isPro]);

  return (
    <PaywallContext.Provider value={{
      isPro,
      userPlan,
      openPaywall,
      closePaywall,
      paywallFeature,
      requirePro,
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
