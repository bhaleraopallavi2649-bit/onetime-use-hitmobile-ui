# UI Changes — Detailed Code-Level Log

> **For the developer continuing this project.**
> This file goes deeper than `README.md`: it names the **exact files, functions, and line
> numbers** of the most recent UI work, shows the relevant code, and explains *why* each
> change was made. Line numbers are accurate as of the pushed commit; they may shift as you
> edit, so also grep for the symbol names given.
>
> Read order: `README.md` (overview) → this file (code detail) → `MATCHING_FEATURE.md`
> (original matching spec — note some of it is now superseded; see §3 below).

---

## 1. Theme — Warm Orange & Cream

**File:** `src/theme.ts`

The entire app palette lives here and is the single source of truth. Every component imports
`colors`/`radius`/`spacing` by name, so editing a value here re-themes the whole app.

Key exported object (`src/theme.ts`, `export const colors`):

```ts
export const colors = {
  brand:     '#E8731C',   // primary orange — buttons, active icons/tabs, logo
  brandDark: '#C25A0C',   // pressed / accents
  brandTint: '#E8731C1A', // ~10% orange tint — active menu / chip backgrounds
  cream:     '#FAF3E8',   // warm cream page background
  ink:       '#17233A',   // primary text (dark navy)
  night:     '#17233A',
  night2:    '#FBE9D6',
  line:      '#ECE0CE',   // soft warm-beige border / divider
  muted:     '#A89F90',
  muted2:    '#6B7280',
  white:     '#FFFFFF',
  // …full status families: red* amber* green* blue* cyan* indigo* purple* pink*
  // …neutral beige chip family: slate* (slateBg = '#F1E3D0')
};
```

Also exported from the same file:
- `unitColors` — availability grid (available = green, **booked = `#EA580C` orange**, sold = slate, on-hold = yellow). Booked is deliberately orange, not teal, so it doesn't read as a tappable button.
- `radius` — `sm 8 / md 12 / lg 16 / xl 20 / 2xl 24 / full 999`
- `spacing` — `xs 4 / sm 8 / md 12 / lg 16 / xl 20 / 2xl 24`

> **Rule:** never hardcode a hex in a screen. Add it to `theme.ts` and reference by name.

---

## 2. Navigation — bottom tabs replaced by a slide-in Sidebar drawer

**File:** `src/components/Sidebar.tsx`

### 2.1 What changed
The old bottom tab bar was removed and replaced with a **custom slide-in drawer** that
mirrors the website's left sidebar. It is built on React Native's `Animated` API, **not
`react-native-reanimated`** (reanimated was avoided to prevent build issues).

### 2.2 Drawer width (top of file, ~line 28)
```ts
const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SCREEN_W * 0.8);
```

### 2.3 Nav items are role-gated (`NAV_ITEMS`, ~lines 55–72)
Each entry carries a `roles` array; `'*'` means everyone. The visible list is computed as:

```ts
const items = NAV_ITEMS.filter(
  item => item.roles.includes('*') || item.roles.includes(role)
);
```

Current entries: **Overview, Projects, Marketplace, Analytics, Organizations, Users
(admin only), Field Check-in (employee only), Notifications, Profile.**

> Role-gating here is **presentation only** — the real security boundary is server-side
> (`restrictTo('admin')` on the user routes). Hiding a menu item does not protect the route.

### 2.4 Four nav links were intentionally removed
Removed from the drawer (per request): **AI Lead Matching, Chat, Field Team, Archive.**

⚠️ **Only the nav links were removed — the screens/route files still exist** in
`app/(dashboard)/`. A repo-wide search found no other `router.push` to them, so they are now
unreachable from the UI but still resolve if navigated to directly.

**Do NOT delete `app/(dashboard)/lead-matching.tsx`** — `crm.tsx` imports and renders it as
the AI Leads tab, so deleting it breaks the Overview screen even though its own route is
unreachable.

### 2.5 Open/close animation (`useEffect`, ~lines 98–115)
```ts
useEffect(() => {
  if (open) {
    Animated.parallel([
      Animated.timing(slideX,         { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropOpacity,{ toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  } else {
    Animated.parallel([
      Animated.timing(slideX,         { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity,{ toValue: 0,         duration: 200, useNativeDriver: true }),
    ]).start();
  }
}, [open]);
```

When fully closed the drawer renders nothing (just an invisible backdrop) for perf.

### 2.6 Drawer open/close state is global
**File:** `src/lib/sidebarContext.tsx` — provides the open/close state app-wide.
**File:** `src/components/MenuButton.tsx` — the button that opens it.

---

## 3. AI Lead Matching — `doMatching` was removed and replaced

> ⚠️ **`MATCHING_FEATURE.md` describes the OLD `doMatching()` approach. That function no
> longer exists.** This section documents what actually ships now.

### 3.1 The replacement: `loadMyMatches()`
**File:** `src/components/GroupChatEmbedded.tsx` — `const loadMyMatches = useCallback(...)`
(around line 1628; the explaining comment block starts ~line 1611).

**Why it replaced `doMatching`:** the old `doMatching` read
`aiApiRef.current.getCurrentParams()` and bailed with *"Please complete your requirement
first"* whenever no AI conversation was active — which is the normal state when the Matching
pill is tapped. Its fallback branch built rows from `builderProjects`, an array only
populated for builder rooms, so in the universal room it was always empty and the sheet
always ended on *"No matching properties available"* after a fake 1.5s delay. Both dead
branches were deleted.

**What `loadMyMatches` does now:**
- Calls `leadMatchingApi.getLeads({ mineOnly: true, ... })` — `mineOnly: true` forces the
  server to return only the signed-in user's own leads (even for admin/captain).
- **Pages through all results** (`LIMIT = 50`, hard stop `MAX_PAGES = 20`) instead of
  reading a single page. The old single-page `getLeads({ limit: 50 })` silently dropped
  everything past the first 50 leads.
- **De-duplicates by project** into a `Map<string, MatchCard>`, keeping the highest match
  score per project (one project can match several of a user's requirements).
- A `{ silent: true }` call runs at mount as a prefetch whose only job is to put the count
  badge on the pill; without `silent` it opens the sheet and shows the spinner.

```ts
const loadMyMatches = useCallback(async (opts?: { silent?: boolean }) => {
  const silent = !!opts?.silent;
  if (!silent) { setShowMatching(true); setMatchingLoading(true); setMatchingError(null); }
  const LIMIT = 50;
  const MAX_PAGES = 20;
  const first = await leadMatchingApi.getLeads({ mineOnly: true, limit: LIMIT, page: 1 });
  const leads = Array.isArray(first?.leads) ? [...first.leads] : [];
  // …derive pageCount from pagination.pages (fallback: total/limit)…
  for (let page = 2; page <= Math.min(pageCount, MAX_PAGES); page++) {
    const next = await leadMatchingApi.getLeads({ mineOnly: true, limit: LIMIT, page });
    const batch = Array.isArray(next?.leads) ? next.leads : [];
    if (batch.length === 0) break;      // list ran out earlier than `pages` claimed
    leads.push(...batch);
  }
  // de-duplicate by projectId, keep highest score → Map<string, MatchCard>
}, [/* deps */]);
```

### 3.2 AI params accessor (still present)
**File:** `src/components/AiAssistant.tsx`
- Interface addition (~line 170): `getCurrentParams: () => Record<string, any>;`
- Implementation (~line 790):
```ts
const getCurrentParams = useCallback((): Record<string, any> => {
  if (!flowState || !flowState.collected) return {};
  return { ...flowState.collected };
}, [flowState]);
```
- Exposed to the parent via `onReady({ …, getCurrentParams })` (~line 924).

### 3.3 Matching API client
**File:** `src/lib/api.ts` — inside `leadMatchingApi` (~lines 2415–2430):
```ts
async testMatch(text: string): Promise<any> {
  const r = await fetch(`${API_URL}/lead-matching/test-match`,
    { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ text }) });
  return handleResponse<any>(r);
},
async matchRequirement(params: any): Promise<any> {
  const parts: string[] = [];
  if (params.bhkType)                       parts.push(params.bhkType);
  if (params.propertyType)                  parts.push(params.propertyType);
  if (params.location || params.locationRaw) parts.push(`near ${params.location || params.locationRaw}`);
  if (params.city)                          parts.push(params.city);
  if (params.budget)                        parts.push(`${params.budget} lakh budget`);
  const text = parts.join(' ');
  const r = await fetch(`${API_URL}/lead-matching/test-match`,
    { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ text }) });
  return handleResponse<any>(r);
},
```

**Endpoints used:** `POST /api/lead-matching/test-match`, `GET /api/lead-matching/leads`
(with `mineOnly`, `limit`, `page`), `PATCH /api/lead-matching/leads/:id/status`.
No backend change was required for the `loadMyMatches` rewrite.

---

## 4. Group Chat UI kit

**Folder:** `src/components/groupChat/` — reusable building blocks:

| File | Purpose |
| --- | --- |
| `MessageBubble.tsx` | chat message bubble |
| `PostCard.tsx` | requirement/post card |
| `BuilderPropertyCard.tsx` | builder's property card |
| `GroupMatchCard.tsx` | match result card (`MatchResultCard`) |
| `CardActions.tsx` | per-card action row |
| `Chips.tsx`, `Tag.tsx` | chips / tags |
| `Field.tsx`, `SelectRow.tsx`, `GroupRow.tsx` | form rows |
| `RoomAvatar.tsx`, `RoomSeparator.tsx` | room list pieces |
| `sharedStyles.ts` | shared StyleSheet for the kit |

Container: `src/components/GroupChatEmbedded.tsx` (the big one — holds `loadMyMatches`, the
matching sheet, the post composer, FAB pills). Supporting logic + tests in
`src/lib/groupChat/` (`messages.ts`, `rooms.ts`, `media.ts`, `formatting.ts`,
`unitSummaries.ts`, `stripGeometry.ts`, with `__tests__/`).

---

## 5. CRM dashboard UI

**Folder:** `src/components/crm/`

| File | Purpose |
| --- | --- |
| `CrmMetricsBar.tsx` | top metrics row |
| `HumanLeadManager.tsx` | lead list, search + stage-filter pills, Add-Lead form, site-visit scheduling (red alerts for missing/close dates) |
| `LeadDetailView.tsx` | sales journey (Inbound / Outbound / AI Guide), 8-stage pipeline, per-stage photo upload, notes, reminders, Call/WhatsApp actions |
| `CrmLeadDrawer.tsx` | lead drawer |
| `LeadCourse.tsx` | journey/course view |

Screen host: `app/(dashboard)/crm.tsx` (the Overview screen with the AI Leads / Human Leads
toggle; renders `lead-matching.tsx` as the AI tab). Site-visit logic lives in
`src/hooks/useSiteVisitTracking.ts`.

---

## 6. Unit inventory grid

**Folder:** `src/components/units/` — `UnitGrid.tsx`, `UnitSetupForm.tsx`.
Cell colors come from `unitColors` in `src/theme.ts`.

---

## 7. Shared / primitive UI components

**Folder:** `src/components/`

| File | What it is |
| --- | --- |
| `AiAssistant.tsx` | AI chat assistant (owns `getCurrentParams`) |
| `ChatEmbedded.tsx` | 1:1 chat surface |
| `GroupChatEmbedded.tsx` | group chat + matching (owns `loadMyMatches`) |
| `ListingCard.tsx` | property listing card |
| `ProjectDetailsModal.tsx` | project detail modal |
| `PropertyMap.tsx` / `PropertyMap.web.tsx` | native map + web fallback |
| `PropertyReels.tsx` | reels / media viewer |
| `ShareActions.tsx` | share sheet |
| `MenuButton.tsx` | opens the Sidebar drawer |
| `Toast.tsx` | `ToastProvider` + `useToast` |
| `Skeleton.tsx` | loading skeletons |
| `EmptyState.tsx` | empty-state placeholder |
| `AuthDecor.tsx` | decorative `BottomWave` for drawer/auth |

---

## 8. Quick reference — where to touch what

| You want to change… | Go to |
| --- | --- |
| Any color / spacing / radius | `src/theme.ts` |
| Side menu items, drawer animation | `src/components/Sidebar.tsx` |
| Drawer open/close state | `src/lib/sidebarContext.tsx` |
| AI matching results / pill count | `src/components/GroupChatEmbedded.tsx` → `loadMyMatches` |
| AI collected params | `src/components/AiAssistant.tsx` → `getCurrentParams` |
| Matching / lead API calls | `src/lib/api.ts` → `leadMatchingApi` |
| CRM lead list / detail | `src/components/crm/*` |
| Chat bubbles / post cards | `src/components/groupChat/*` |
| Routing / which screens exist | `app/` and `app/(dashboard)/` |

---

## 9. Build & run (recap)

```bash
npm install
npm start                       # Expo + QR (Expo Go)
npm run android                 # emulator/device

# production APK (native rebuild needed for these changes):
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Backend URL: `app.json` → `expo.extra.apiUrl`. Tests: `npm test` (Jest, `src/**/__tests__`).
