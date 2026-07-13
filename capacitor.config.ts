import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the LIVE published Lovable site — the app is TanStack Start SSR
// on Cloudflare, so there is no static `index.html` to bundle offline. `webDir`
// points to a tiny stub folder that only exists to satisfy `cap sync`; the real
// UI is served from `server.url`. Override with CAP_SERVER_URL for local dev.
// OAuth returns to an HTTPS callback on this domain, which then opens the
// registered `oxidatii://oauth` native scheme.
const PUBLISHED_URL = "https://oxidatii.life";
const devServerUrl = process.env.CAP_SERVER_URL ?? PUBLISHED_URL;

const config: CapacitorConfig = {
  appId: "com.oxidatii.app",
  appName: "OXIDAȚII",
  webDir: "capacitor-www",
  server: {
    url: devServerUrl,
    cleartext: true,
    // Hosts that the remote WebView may navigate to. OAuth itself is opened
    // deliberately in a secure system Custom Tab / Safari view.
    allowNavigation: [
      "oxidatii.life",
      "*.oxidatii.life",
      "*.lovable.app",
      "*.lovable.dev",
      "accounts.google.com",
      "*.google.com",
      "*.googleusercontent.com",
      "appleid.apple.com",
      "*.apple.com",
      "*.supabase.co",
    ],
  },
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
