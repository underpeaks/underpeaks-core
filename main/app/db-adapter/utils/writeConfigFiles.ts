// app/lib/writeConfigFromStore.ts (Core)
import { InstallerState } from "@/app/store/useInstallerStore";
import fs   from "fs";
import path from "path";

const { DB_TYPE, DB_URL, DB_ANON_KEY } = process.env;

export async function writeConfigFromStore(store: InstallerState) {
  const rootDir  = process.cwd();
  const filePath = path.join(rootDir, "underpeaks.config.json");

  const config = {
    projectName:         store.projectName,
    subdomain:           store.subdomain,
    selectedStack:       store.selectedStack,
    selectedDb:          store.selectedDb,
    deploymentType:      "self-hosted",
    studioUrl:           store.studioUrl ?? 'https://studio.underpeaks.com',
    dbConfig: {
      type: DB_TYPE || store.selectedDb || "supabase",
    },
    faviconUrl:          '/images/favicon/underpeaks_favi.png',
    ecommerceEnabled:    store.ecommerceEnabled,
    demoContentEnabled:  store.demoContentEnabled,
    selectedPages:       store.selectedPages,
    models:              store.models,
    adminUser: {
      fullName: store.adminUser.fullName,
      email:    store.adminUser.email,
    },
    featureFlags: {
      ecommerce:   store.ecommerceEnabled,
      demoContent: store.demoContentEnabled,
    },
    selectedProjectType: store.selectedProjectType,
    installed:           store.installed,
  };

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");

  return { success: true, filePath };
}