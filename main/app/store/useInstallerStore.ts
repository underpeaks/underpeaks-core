import { create } from "zustand";
import { DBType, DBConfig } from "../db-adapter/types";

export type InstallerState = {
  projectName: string;
  subdomain: string;
  ecommerceEnabled: boolean;
  demoContentEnabled: boolean;
  selectedPages: string[];
  selectedStack: "next" | "flutter" | "both";
  selectedDb: DBType | null;
  dbConfig: DBConfig;
  adminUser: {
    fullName: string;
    email: string;
    password: string;
  };
  models: any[];
  setInstallerValue: <T extends keyof InstallerState>(key: T, value: InstallerState[T]) => void;
  resetInstaller: () => void;
};

export const useInstallerStore = create<InstallerState>((set) => ({
  projectName: "",
  subdomain: "",
  ecommerceEnabled: false,
  demoContentEnabled: false,
  selectedPages: [],
  selectedStack: "next",
  selectedDb: null,
  dbConfig: { type: "supabase" }, // default with type set
  adminUser: {
    fullName: "",
    email: "",
    password: "",
  },
  models: [],
  setInstallerValue: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),
  resetInstaller: () =>
    set(() => ({
      projectName: "",
      subdomain: "",
      ecommerceEnabled: false,
      demoContentEnabled: false,
      selectedPages: [],
      selectedStack: "next",
      selectedDb: null,
      dbConfig: { type: "supabase" },
      adminUser: {
        fullName: "",
        email: "",
        password: "",
      },
      models: [],
    })),
}));
