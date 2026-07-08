# App Store Screenshots

Fastlane `deliver` încarcă automat orice imagine din folderele astea.

## Structură

```
fastlane/screenshots/
├── ro/           # capturi în română
│   ├── iPhone 6.9 Display-1_home.png       (1290x2796)
│   ├── iPhone 6.9 Display-2_map.png
│   ├── iPhone 6.9 Display-3_sprits.png
│   ├── iPhone 6.5 Display-1_home.png       (1284x2778 sau 1242x2688)
│   └── ...
└── en-US/        # capturi în engleză (aceleași nume)
    └── ...
```

## Dimensiuni obligatorii (Apple minim)

| Device                | Rezoluție           | Minim capturi |
| --------------------- | ------------------- | ------------- |
| iPhone 6.9" (Pro Max) | 1290 × 2796         | 3 (max 10)    |
| iPhone 6.5" (opt.)    | 1242 × 2688         | opțional      |
| iPad 13" (dacă supp.) | 2064 × 2752         | 3             |

Dacă publici doar pe iPhone, e suficient 6.9". App Store scalează automat pentru celelalte device-uri.

## Cel mai simplu mod de a le face

1. Deschide simulatorul: `bunx cap open ios` → alege iPhone 15 Pro Max (6.9")
2. În simulator: **File → Screenshot** (⌘S). Salvează în folderul respectiv.
3. Redenumește la formatul `iPhone 6.9 Display-<n>_<nume>.png`.
4. Repetă în engleză (schimbă limba din app → Setări → Limbă).

## Ordinea afișării

Numele fișierului determină ordinea (sortare alfabetică). Prefixează cu `1_`, `2_`, `3_` ca să controlezi.

## Overlay-uri / rame (opțional)

Poți folosi `fastlane frameit` să adaugi rame de device automat:
```bash
cd fastlane/screenshots
bundle exec fastlane frameit
```
