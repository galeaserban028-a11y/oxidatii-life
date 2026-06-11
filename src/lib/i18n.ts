import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const ro = {
  common: {
    back: "Înapoi",
    home: "Acasă",
    retry: "Reîncearcă",
    cancel: "Anulează",
    save: "Salvează",
    delete: "Șterge",
    edit: "Editează",
    loading: "Se încarcă...",
    error: "Eroare",
    live: "live",
    appCrashed: "A picat aplicația",
    tryAgain: "Încearcă din nou.",
    pageNotFound: "Pagina nu există",
    lostInChaos: "Te-ai rătăcit în haos. Hai înapoi.",
    alcoholWarning: "Alcoolul dăunează grav sănătății.",
  },
  tabs: {
    live: "Live",
    map: "Hartă",
    top: "Top",
    post: "Postează",
    sprits: "Șpriț",
    messages: "Mesaje",
    me: "Eu",
  },
  settings: {
    title: "Setări",
    language: "Limbă",
    languageRo: "Română",
    languageEn: "English",
    publicAccount: "Cont public",
    privateAccount: "Cont privat",
    locationLiveOn: "Locație live activată",
    locationLiveOff: "Locație live oprită",
    cityUpdated: "Oraș actualizat",
    logout: "Ieșire din cont",
    deleteAccount: "Șterge contul",
    privacy: "Confidențialitate",
    notifications: "Notificări",
    city: "Oraș",
    profile: "Profil",
    blocked: "Blocați",
  },
};

const en = {
  common: {
    back: "Back",
    home: "Home",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading...",
    error: "Error",
    live: "live",
    appCrashed: "The app crashed",
    tryAgain: "Try again.",
    pageNotFound: "Page not found",
    lostInChaos: "You got lost in the chaos. Head back.",
    alcoholWarning: "Excessive alcohol consumption is harmful to your health.",
  },
  tabs: {
    live: "Live",
    map: "Map",
    top: "Top",
    post: "Post",
    sprits: "Spritz",
    messages: "Messages",
    me: "Me",
  },
  settings: {
    title: "Settings",
    language: "Language",
    languageRo: "Română",
    languageEn: "English",
    publicAccount: "Public account",
    privateAccount: "Private account",
    locationLiveOn: "Live location enabled",
    locationLiveOff: "Live location disabled",
    cityUpdated: "City updated",
    logout: "Sign out",
    deleteAccount: "Delete account",
    privacy: "Privacy",
    notifications: "Notifications",
    city: "City",
    profile: "Profile",
    blocked: "Blocked",
  },
};

const initialLng = "ro";
// Keep the first client render identical to SSR. Stored/browser language is
// applied after hydration by DomTranslator to avoid hydration crashes.

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { ro: ro, en: en },
    lng: initialLng,
    fallbackLng: "ro",
    supportedLngs: ["ro", "en"],
    defaultNS: "common",
    ns: ["common", "tabs", "settings"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
