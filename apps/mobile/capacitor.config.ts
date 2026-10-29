import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medicalproj.app',
  appName: 'Medical App',
  webDir: '../../dist/apps/mobile/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;

