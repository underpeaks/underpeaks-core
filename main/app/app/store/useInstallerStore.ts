import { create } from 'zustand';

type DBOption = 'supabase' | 'firebase' | 'postgres' | 'mysql' | 'mongodb' | 'SQLServer' |'mariaDB' | 'PlanetScale';

type InstallerState = {
  projectName: string;
  subdomain: string;
  ecommerceEnabled: boolean;
  demoContentEnabled: boolean;
  selectedPages: string[]; // e.g. ['auth', 'dashboard']
  selectedStack: 'next' | 'flutter' | 'both';
  selectedDb: DBOption | null;
  dbConfig: Record<string, any>; // accepts JSON config like Firebase
  adminUser: {
    fullName: string;
    email: string;
    password: string;
  };
  models: any[]; // eventually shape this properly
  setInstallerValue: <T extends keyof InstallerState>(key: T, value: InstallerState[T]) => void;
  resetInstaller: () => void;
};

export const useInstallerStore = create<InstallerState>((set) => ({
  projectName: '',
  subdomain: '',
  ecommerceEnabled: false,
  demoContentEnabled: false,
  selectedPages: [],
  selectedStack: 'next',
  selectedDb: null,
  dbConfig: {},
  adminUser: {
    fullName:'',
    email: '',
    password: '',
  },
  models: [],
  setInstallerValue: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),
  resetInstaller: () =>
    set(() => ({
      projectName: '',
      subdomain: '',
      ecommerceEnabled: false,
      demoContentEnabled: false,
      selectedPages: [],
      selectedStack: 'next',
      selectedDb: null,
      dbConfig: {},
      adminUser: {
        fullName:'',
        email: '',
        password: '',
      },
      models: [],
    })),
}));
