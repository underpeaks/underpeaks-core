import { create } from "zustand";
import { DBType, DBConfig } from "../db-adapter/types";

export type InstallerState = {
  // =========================
  // PROJECT BASICS
  // =========================
  projectName: string;
  domain: string;
  subdomain: string;

  selectedProjectType: string;
  selectedPages: string[];

  selectedStack: "next" | "flutter" | "cms" | "both";
  selectedDb: DBType | null;

  // =========================
  // FEATURES
  // =========================
  ecommerceEnabled: boolean;
  demoContentEnabled: boolean;

  // =========================
  // DATABASE CONFIG
  // =========================
  dbConfig: DBConfig & {
    storageBucket?: string;
  };

  // =========================
  // ADMIN USER
  // =========================
  adminUser: {
    fullName: string;
    email: string;
    password: string;
  };

  // =========================
  // MODELS
  // =========================
  models: any[];

  // =========================
  // BRANDING (MATCHES nxf_system_config)
  // =========================
  branding: {
    logoUrl: string;
    primaryColor: string;
  };

  // =========================
  // ACTIONS
  // =========================
  setInstallerValue: <T extends keyof InstallerState>(
    key: T,
    value: InstallerState[T]
  ) => void;

  resetInstaller: () => void;
};

export const useInstallerStore = create<InstallerState>((set) => ({
  // =========================
  // PROJECT BASICS
  // =========================
  projectName: "",
  domain: "",
  subdomain: "",

  selectedProjectType: "blank",
  selectedPages: [],

  selectedStack: "both",
  selectedDb: null,

  // =========================
  // FEATURES
  // =========================
  ecommerceEnabled: false,
  demoContentEnabled: false,

  // =========================
  // DATABASE CONFIG
  // =========================
  dbConfig: {
    type: "supabase",
    storageBucket: "",
  },

  // =========================
  // ADMIN USER
  // =========================
  adminUser: {
    fullName: "",
    email: "",
    password: "",
  },

  // =========================
  // MODELS
  // =========================
  models: [],

  // =========================
  // BRANDING
  // =========================
  branding: {
    logoUrl: "",
    primaryColor: "#000000",
  },

  // =========================
  // ACTIONS
  // =========================
  setInstallerValue: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),

  resetInstaller: () =>
    set(() => ({
      projectName: "",
      domain: "",
      subdomain: "",

      selectedProjectType: "blank",
      selectedPages: [],

      selectedStack: "both",
      selectedDb: null,

      ecommerceEnabled: false,
      demoContentEnabled: false,

      dbConfig: {
        type: "supabase",
        storageBucket: "",
      },

      adminUser: {
        fullName: "",
        email: "",
        password: "",
      },

      models: [],

      branding: {
        logoUrl: "",
        primaryColor: "#000000",
      },
    })),
}));