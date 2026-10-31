# HomeInTown Mobile — UI Changes & Developer Handover

> **Purpose of this repo (`onetime-use-hitmobile-ui`)**
> This is a **temporary, one-time share** of the HomeInTown mobile app source so another
> developer can download it, understand the UI work already done, and continue the
> modifications. This document lists **what UI changes were made, where the code lives,
> and how to run/build the app.** Read this file first.

---

## 1. What this app is

Native mobile app for the **HomeInTown** real-estate sales platform.

| Thing | Value |
| --- | --- |
| Framework | **Expo** (SDK 52) + **expo-router** (file-based routing) |
| Language | TypeScript + React Native (0.76.9) |
| Styling | Plain **StyleSheet** + a central theme (`src/theme.ts`). **NativeWind was removed** because it crashed production builds. |
| Icons | `lucide-react-native` |
| Maps | `react-native-maps` (native) + `PropertyMap.web.tsx` (web fallback) |
| Realtime | `socket.io-client` |
| Auth storage | `expo-secure-store` (JWT Bearer token) |
| Backend API | `https://sales-website-backend-...run.app/api` (set in `app.json` → `expo.extra.apiUrl`) |

---

## 2. Design system (START HERE)

**File: `src/theme.ts`** — the single source of truth for all colors, radii, spacing.

The app was **redesigned to a Warm Orange & Cream theme** ("HomeInTown reference redesign").
Key palette:

| Name | Value | Use |
| --- | --- | --- |
| `brand` | `#E8731C` | primary orange — buttons, active icons/tabs, logo |
| `brandDark` | `#C25A0C` | pressed / accents |
| `brandTint` | `#E8731C1A` | ~10% orange tint for active menu / chips |
| `cream` | `#FAF3E8` | warm cream page background |
| `ink` / `night` | `#17233A` | primary text (dark navy) |
| `line` | `#ECE0CE` | soft warm-beige borders / dividers |
| `muted2` | `#6B7280` | secondary text |

Plus full status-color families (`red*`, `amber*`, `green*`, `blue*`, etc.) and a
neutral beige chip family (`slate*`).

Also exported from `theme.ts`:
- `unitColors` — availability grid colors (available=green, booked=orange, sold=slate, on-hold=yellow)
- `radius` (sm…2xl, full)
- `spacing` (xs…2xl)

> **Important:** every screen references the theme by **name**, so changing a value in
> `theme.ts` updates the whole app automatically. Don't hardcode hex values in screens.

---

## 3. App structure & routing

`expo-router` = file-based routing. A file in `app/` becomes a route.

```
app/
├── _layout.tsx            # root providers (auth, toast, sidebar) + auth-gated navigation
├── index.tsx              # entry redirect (employee → field, others → crm)
├── login.tsx              # auth flows (login / register / forgot-MPIN / OTP / reset)
└── (dashboard)/
    ├── _layout.tsx        # dashboard shell (top bar, sidebar trigger, sign out)
    ├── crm.tsx            # Overview dashboard (AI Leads / Human Leads toggle)
    ├── crm-leads.tsx
    ├── lead-matching.tsx  # AI Lead Matching (rendered inside crm.tsx as the AI tab)
    ├── projects.tsx
    ├── add-project.tsx
    ├── property-detail.tsx
    ├── marketplace.tsx
    ├── analytics.tsx
    ├── organizations.tsx
    ├── admin-users.tsx
    ├── employees.tsx
    ├── captain-team.tsx
    ├── field.tsx          # field-worker check-in screen
    ├── chat.tsx
    ├── group-chat.tsx
    ├── notifications.tsx
    ├── archive.tsx
    ├── profile.tsx
    └── settings.tsx
```

---

## 4. UI changes that were made (and where)

### 4.1 Navigation redesign — bottom tabs → slide-in Sidebar (drawer)
- **File: `src/components/Sidebar.tsx`**
- Replaced the bottom tab bar with a **custom slide-in drawer** that matches the
  website's left sidebar. Built on React Native's `Animated` API (no `react-native-reanimated`, to avoid build issues).
- Drawer width: `min(300, 80% of screen)`.
- Nav items are **role-gated** via the `roles` array on each `NavItem` (`admin`, `builder`, `captain`, `agent`, or `*`).
- **Current nav items:** Overview, Projects, Marketplace, Analytics, Organizations, Role Users, Field Check-in, Notifications, Profile.
- **Four items were intentionally removed from the drawer** (per request): *AI Lead Matching, Chat, Field Team, Archive*.
  - ⚠️ **The screens still exist** — only their nav links were removed. The route files were **not** deleted, so the screens still resolve. `lead-matching.tsx` **must stay** because `crm.tsx` imports and renders it as the AI Leads tab.
- Drawer state is shared app-wide via **`src/lib/sidebarContext.tsx`**.

### 4.2 Warm Orange & Cream re-theme
- **File: `src/theme.ts`** (see Section 2).
- All brand/surface/text/status colors were re-mapped to the new warm palette while
  keeping the **same key names**, so every screen picked up the new look with no per-screen edits.

### 4.3 AI Lead Matching feature
- Full spec in **`MATCHING_FEATURE.md`** (kept in repo root — read it for details).
- **Files touched:**
  - `src/components/GroupChatEmbedded.tsx` — added floating action buttons (**"My Post"**, **"Matching"**), `doMatching()`, and the **matching-results modal**.
  - `src/components/AiAssistant.tsx` — added `getCurrentParams()` to expose AI-collected requirement params (bhkType, budget, location, city…).
  - `src/lib/api.ts` — added `testMatch(text)` and `matchRequirement(params)`.
- **UI:** FABs bottom-right (80px from bottom, z-index 100). Results modal shows property cards with a **color-coded match-score badge** (green ≥70%, amber ≥50%, gray <50%), BHK/price chips, matched-criteria tags, and owner info.

### 4.4 Group Chat UI kit
- **Folder: `src/components/groupChat/`** — reusable pieces for the chat/marketplace UI:
  `MessageBubble.tsx`, `PostCard.tsx`, `BuilderPropertyCard.tsx`, `GroupMatchCard.tsx`,
  `CardActions.tsx`, `Chips.tsx`, `Tag.tsx`, `Field.tsx`, `SelectRow.tsx`, `GroupRow.tsx`,
  `RoomAvatar.tsx`, `RoomSeparator.tsx`, and shared styles in `sharedStyles.ts`.

### 4.5 CRM dashboard UI
- **Folder: `src/components/crm/`**
  - `CrmMetricsBar.tsx` — top metrics row.
  - `HumanLeadManager.tsx` — lead list, search + stage-filter pills, Add-Lead form, site-visit scheduling (red alerts for missing/close dates).
  - `LeadDetailView.tsx` — sales journey (Inbound / Outbound / AI Guide), 8-stage pipeline, per-stage photo upload, notes, reminders, Call/WhatsApp actions.
  - `CrmLeadDrawer.tsx`, `LeadCourse.tsx`.

### 4.6 Unit inventory grid
- **Folder: `src/components/units/`** — `UnitGrid.tsx`, `UnitSetupForm.tsx`.
- Colors come from `unitColors` in `theme.ts` (booked stays **orange** so it doesn't look like a tappable teal button).

### 4.7 Shared / primitive UI components
Located in **`src/components/`**:

| File | What it is |
| --- | --- |
| `AiAssistant.tsx` | AI chat assistant widget |
| `ChatEmbedded.tsx` / `GroupChatEmbedded.tsx` | embedded chat surfaces |
| `ListingCard.tsx` | property listing card |
| `ProjectDetailsModal.tsx` | project detail modal |
| `PropertyMap.tsx` / `PropertyMap.web.tsx` | map (native + web fallback) |
| `PropertyReels.tsx` | reels / media viewer |
| `ShareActions.tsx` | share sheet actions |
| `MenuButton.tsx` | opens the sidebar drawer |
| `Toast.tsx` | toast provider (`ToastProvider`, `useToast`) |
| `Skeleton.tsx` | loading skeletons |
| `EmptyState.tsx` | empty-state placeholder |
| `AuthDecor.tsx` | decorative `BottomWave` etc. for auth screens |

---

## 5. Supporting code (not UI, but UI depends on it)

| File / folder | Role |
| --- | --- |
| `src/lib/api.ts` | REST API client (token-based) |
| `src/lib/authContext.tsx` | auth provider + `useAuth()` |
| `src/lib/sidebarContext.tsx` | drawer open/close state |
| `src/lib/socket.ts` + `src/hooks/useSocket.ts` | realtime socket |
| `src/lib/storage.ts` / `storage.web.ts` | SecureStore token helpers |
| `src/lib/mapProperties.ts`, `propertyPhotos.ts`, `units.ts`, `adminUsers.ts` | data helpers |
| `src/hooks/useSiteVisitTracking.ts` | site-visit scheduling logic |

---

## 6. Run the app

```bash
npm install
npm start          # Expo Dev Tools + QR code (scan with Expo Go)
npm run android    # Android emulator/device
npm run ios        # iOS simulator (macOS only)
```

### Point at a different backend
Edit `app.json` → `expo.extra.apiUrl`. For a local backend use your machine's **LAN IP**, not `localhost` (the phone can't reach your dev machine's localhost):
```json
"extra": { "apiUrl": "http://192.168.1.20:5001/api" }
```

---

## 7. Production build (Android APK)

The matching/UI changes need a full native rebuild:
```bash
cd android
./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## 8. Notes for the next developer

- **Don't hardcode colors** — add/adjust them in `src/theme.ts`.
- **Removed nav items are dead links, not dead screens.** If you want to fully remove *Chat / Archive / Field Team* you must also delete their route files in `app/(dashboard)/` and any imports. **Do NOT delete `lead-matching.tsx`** — `crm.tsx` renders it.
- **NativeWind is intentionally gone.** Use `StyleSheet.create(...)` with `theme.ts` values; don't re-introduce Tailwind classes.
- `MATCHING_FEATURE.md` has the deepest detail on the AI matching UI + API contract.
- Tests: `npm test` (Jest; tests live in `src/**/__tests__`).
