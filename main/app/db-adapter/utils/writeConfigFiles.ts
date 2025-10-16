import { InstallerState } from "@/app/store/useInstallerStore";
import fs from "fs";
import path from "path";

// Pull sensitive DB values from environment variables
const { DB_TYPE, DB_URL, DB_ANON_KEY } = process.env;

export async function writeConfigFromStore(store: InstallerState) {
  const rootDir = process.cwd();
  const filePath = path.join(rootDir, "nxt_flutter.config.json");

  const config = {
    projectName: store.projectName,
    subdomain: store.subdomain,
    selectedStack: store.selectedStack,
    selectedDb: store.selectedDb,
    deploymentType: "self-hosted", // <-- added flag
    dbConfig: {
      type: DB_TYPE || store.selectedDb || "supabase",
      // Do not expose secrets in config
    },
    ecommerceEnabled: store.ecommerceEnabled,
    demoContentEnabled: store.demoContentEnabled,
    selectedPages: store.selectedPages,
    models: store.models,
    adminUser: {
      fullName: store.adminUser.fullName,
      email: store.adminUser.email,
    },
    featureFlags: {
      ecommerce: store.ecommerceEnabled,
      demoContent: store.demoContentEnabled,
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");

  return { success: true, filePath };
}
