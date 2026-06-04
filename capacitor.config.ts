import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oxidatii.app",
  appName: "OXIDAȚII",
  webDir: "dist/client",
  server: {
    url: "https://oxidatii.lovable.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#1a120c",
  },
  android: {
    backgroundColor: "#1a120c",
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a120c",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
