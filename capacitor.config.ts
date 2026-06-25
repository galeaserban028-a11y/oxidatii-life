import type { CapacitorConfig } from "@capacitor/cli";

// Native build (App Store / Google Play): use local bundled assets from dist/client.
// To dev against the live preview, set CAP_SERVER_URL env before running `cap sync`.
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.oxidatii.app",
  appName: "OXIDAȚII",
  webDir: "dist/client",
  ...(devServerUrl
    ? { server: { url: devServerUrl, cleartext: true } }
    : {}),
  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#1a120c",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#1a120c",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#1a120c",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a120c",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Geolocation: {
      // iOS Info.plist + Android manifest descriptions still need
      // to be set per platform; see ios/App/App/Info.plist & AndroidManifest.xml.
    },
    Camera: {
      // Same: descriptions live in platform manifests.
    },
  },
};

export default config;
