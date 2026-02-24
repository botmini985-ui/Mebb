import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.purgehub.app',
  appName: 'Purge Hub',
  webDir: 'dist',
  server: {
    url: 'https://purge-hub-social-einm.vercel.app',
    cleartext: true,
  },
  android: {
    // Permet à Capacitor de gérer les App Links entrants
    appendUserAgent: 'PurgeHubApp',
  },
  plugins: {
    // Le plugin App de Capacitor gère appUrlOpen automatiquement
    // Aucune config supplémentaire requise ici
  },
};

export default config;
