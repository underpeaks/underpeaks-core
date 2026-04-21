import { create } from "zustand";
import { DBType, DBConfig } from "../db-adapter/types";

export type InstallerState = {
  projectName: string;
  domain: string;
  subdomain: string;
  ecommerceEnabled: boolean;
  demoContentEnabled: boolean;
  selectedProjectType: string;
  selectedPages: string[];
  selectedStack: "next" | "flutter" | "cms" |"both";
  selectedDb: DBType | null;
  dbConfig: DBConfig & { storageBucket?: string };
  adminUser: {
    fullName: string;
    email: string;
    password: string;
  };
  models: any[];


 

  setInstallerValue: <T extends keyof InstallerState>(
    key: T,
    value: InstallerState[T]
  ) => void;
  resetInstaller: () => void;
};

export const useInstallerStore = create<InstallerState>((set) => ({
  projectName: "",
  domain: "",
  subdomain: "",
  ecommerceEnabled: false,
  demoContentEnabled: false,
  selectedProjectType: "blank",
  selectedPages: [],
  selectedStack: "both",
  selectedDb: null,
  databaseName: "",
  dbConfig: { type: "supabase", storageBucket: "" },
  adminUser: {
    fullName: "",
    email: "",
    password: "",
  },
  models: [],

  // NEW: initialize with blank project type
 

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
      ecommerceEnabled: false,
      demoContentEnabled: false,
      selectedProjectType: "blank",
      selectedPages: [],
      selectedStack: "both",
      selectedDb: null,
      dbConfig: { type: "supabase", storageBucket: "" },
      adminUser: {
        fullName: "",
        email: "",
        password: "",
      },
      models: [],
      
    })),
}));