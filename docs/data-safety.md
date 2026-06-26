# Google Play Data Safety Form — OXIDAȚII

> Răspunsuri gata de copiat în Google Play Console → App content → Data safety.
> EN copies included after each RO answer.

## 1. Colectare de date / Data collection

| Tip de date | Colectăm? | Motiv |
|-------------|-----------|-------|
| Locație (aproximativă și precisă) | Da | Afișăm cluburi, prieteni și zone fierbinți în apropiere. |
| Adresă de email | Da | Autentificare, bonuri, notificări. |
| Număr de telefon | Opțional | Verificare cont business / support. |
| Fotografii și videoclipuri | Da | Faze, avatar, poze la check-in. |
| Mesaje | Da | Chat între utilizatori. |
| ID-uri de dispozitiv / push token | Da | Notificări push native. |
| Informații de plată | Nu | Procesată direct de Stripe; noi nu o atingem. |
| Contacte / agendă | Nu | Niciodată. |

| Data type | Collected? | Reason |
|-----------|------------|--------|
| Location (approximate & precise) | Yes | Show nearby clubs, friends and hot zones. |
| Email address | Yes | Authentication, receipts, notifications. |
| Phone number | Optional | Business account verification / support. |
| Photos & videos | Yes | Phases, avatars, check-in photos. |
| Messages | Yes | User-to-user chat. |
| Device IDs / push token | Yes | Native push notifications. |
| Payment info | No | Handled directly by Stripe; we never touch it. |
| Contacts / address book | No | Never. |

## 2. Securitatea datelor / Data security

- Datele în tranzit sunt criptate cu TLS 1.2+.
- Datele stocate în backend sunt criptate la rest (AES-256) de către providerul cloud.
- Implementăm Row-Level Security (RLS) pentru ca fiecare utilizator să acceseze doar datele proprii.
- Nu vindem, nu închiriem și nu partajăm date cu terți pentru publicitate.

- Data in transit is encrypted with TLS 1.2+.
- Stored data is encrypted at rest (AES-256) by the cloud provider.
- Row-Level Security (RLS) ensures each user only accesses their own data.
- We do not sell, rent or share data with third parties for advertising.

## 3. Scopul prelucrării / Data usage

- Funcționarea aplicației (harta, lista de cluburi, chat, profil).
- Analitice și îmbunătățirea produsului (agregate, anonimizate).
- Notificări push despre șprițuri, invitații și mesaje.

- Core app functionality (map, venue list, chat, profile).
- Product analytics and improvements (aggregated, anonymized).
- Push notifications about spritzes, invites and messages.

## 4. Datele șterse la cerere / Data deletion

Utilizatorii pot șterge contul din aplicație (Settings → Șterge cont). La ștergere:
- Profilul și datele asociate sunt șterse sau anonimizate în 30 de zile.
- Mesajele trimise de utilizator rămân în conversațiile recipienților pentru integritatea chat-ului, dar numele și avatarul sunt anonimizate.

Users can delete their account in-app (Settings → Delete account). Upon deletion:
- Profile and associated data are deleted or anonymized within 30 days.
- Messages sent by the user remain in recipients' conversations for chat integrity, but the sender name and avatar are anonymized.

## 5. Reglementări / Regulations

- GDPR (UE): politică de confidențialitate la https://oxidatii.life/privacy
- Vârsta minimă: 17+ (nightlife, alcool).

- GDPR (EU): privacy policy at https://oxidatii.life/privacy
- Minimum age: 17+ (nightlife, alcohol).
