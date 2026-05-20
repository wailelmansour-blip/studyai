// store/purchaseStore.ts
import { create } from "zustand";
import Purchases, { PurchasesPackage, CustomerInfo } from "react-native-purchases";
import { Platform } from "react-native";

const REVENUECAT_GOOGLE_API_KEY = "goog_BcAOmQYmDZcpUesYAOYDzfOZKOM";

interface PurchaseStore {
  isInitialized: boolean;
  isPremium: boolean;
  packages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;

  initialize: (userId: string) => Promise<void>;
  fetchPackages: () => Promise<void>;
  purchasePremium: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkPremiumStatus: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseStore>((set, get) => ({
  isInitialized: false,
  isPremium: false,
  packages: [],
  customerInfo: null,
  isLoading: false,
  error: null,

  initialize: async (userId: string) => {
    try {
      if (Platform.OS === "android") {
        await Purchases.configure({ apiKey: REVENUECAT_GOOGLE_API_KEY, appUserID: userId });
      }
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      set({ isInitialized: true });
      await get().checkPremiumStatus();
    } catch (e) {
      console.log("RevenueCat init error:", e);
    }
  },

  fetchPackages: async () => {
    set({ isLoading: true, error: null });
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (current && current.availablePackages.length > 0) {
        set({ packages: current.availablePackages });
      }
    } catch (e: any) {
      set({ error: e.message });
      console.log("fetchPackages error:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  purchasePremium: async (pkg: PurchasesPackage) => {
    set({ isLoading: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
      set({ isPremium, customerInfo, isLoading: false });
      return isPremium;
    } catch (e: any) {
      if (!e.userCancelled) {
        set({ error: e.message });
      }
      set({ isLoading: false });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
      set({ isPremium, customerInfo, isLoading: false });
      return isPremium;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  checkPremiumStatus: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
      set({ isPremium, customerInfo });
    } catch (e) {
      console.log("checkPremiumStatus error:", e);
    }
  },
}));