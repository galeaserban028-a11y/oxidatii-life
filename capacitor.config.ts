import type { CapacitorConfig } from "@capacitor/cli";

// Two runtime modes controlled by env at `cap sync` time:
//
//   CAP_PLATFORM=android → Android bundles dist/spa/ locally (no server.url).
//                          The webview loads index.html from the APK; every
//                          createServerFn/API call goes to https://oxidatii.life
//                          via absolute URLs baked in at build time.
//
//   default (iOS / dev)  → uses server.url pointing at the live site. Works
//                          today, no reason to change it.
//
// Override the remote URL locally with CAP_SERVER_URL.
const PUBLISHED_URL = "https://oxidatii.life";
const devServerUrl = process.env.CAP_SERVER_URL ?? PUBLISHED_URL;
const targetAndroid =
  process.env.CAP_PLATFORM === "android" ||
  process.argv.some((arg) => arg.toLowerCase() === "android");

const baseConfig: CapacitorConfig = {
  appId: "com.oxidatii.app",
  appName: "OXIDAȚII",
  webDir: targetAndroid ? "dist/spa" : "capacitor-www",
  ...(targetAndroid
    ? {
        server: {
          hostname: "localhost",
          // Must live under `server`, not `android`: Capacitor reads the local
          // WebView origin from `server.androidScheme`. This keeps Android on
          // the bundled app assets at https://localhost instead of the remote site.
          androidScheme: "https" as const,
        },
      }
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
    Geolocation: {},
    Camera: {},
  },
};

// Only set server.url on non-Android builds. Android must load the local
// bundle; a server.url here would send it back to the web app.
const config: CapacitorConfig = targetAndroid
  ? baseConfig
  : {
      ...baseConfig,
      server: {
        url: devServerUrl,
        cleartext: false,
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
    };

export default config;
