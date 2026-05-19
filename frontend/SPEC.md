# Call20 Frontend Redesign — SPEC.md

## 1. Concept & Vision

A premium Voice AI dashboard for African SMEs — professional, trustworthy, and distinctly African. The aesthetic evokes fintech confidence (like Paystack/Chipper) rather than generic SaaS purple gradients. Dark sidebar, light content area, sharp green accents for active/call states, warm typography that feels both modern and accessible.

## 2. Design Language

### Aesthetic Direction
**"African Fintech Premium"** — Clean, confident, professional. Dark navigation (like Linear/Resend), light content areas, green primary accent (African prosperity/growth), subtle geometric patterns inspired by African textile motifs.

### Color Palette
```css
--background: #FAFAFA (light gray content area)
--foreground: #111111 (primary text)
--card: #FFFFFF (white cards)
--primary: #00A86B (prosperity green - Nigerian money green)
--primary-foreground: #FFFFFF
--secondary: #F5F5F5 (subtle gray)
--accent: #00A86B (same green)
--muted: #F5F5F5
--muted-foreground: #717171
--border: #E5E5E5
--destructive: #DC2626
--sidebar-bg: #0D0D0D (near black)
--sidebar-foreground: #FAFAFA
--sidebar-accent: #1A1A1A
```

### Typography
- **Display**: "Satoshi" (geometric, confident) — headings
- **Body**: "Inter" with optical sizing — body text (exception to rule: Inter is appropriate here for fintech readability)
- **Mono**: "JetBrains Mono" — API keys, code

### Motion Philosophy
- Page transitions: fade + subtle slide (200ms ease-out)
- Cards: hover lift with shadow transition (150ms)
- Buttons: scale 0.98 on press, color transition 100ms
- Loading states: subtle pulse, skeleton shimmer left-to-right
- Data tables: row fade-in staggered (50ms delay)

### Spatial System
- 4px base unit
- Card padding: 24px
- Section spacing: 32px
- Sidebar width: 260px
- Content max-width: 1400px

## 3. Layout & Structure

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar 260px]  │  [Content Area - fluid]                  │
│                  │                                          │
│  Logo            │  ┌─ Page Header ──────────────────────┐ │
│                  │  │  Title          [Action Buttons]    │ │
│  ─────────       │  └────────────────────────────────────┘ │
│                  │                                          │
│  Dashboard       │  ┌─ Stats Row (4 cards) ──────────────┐ │
│  Agents          │  │ [Calls] [Active] [Credits] [DIDs]  │ │
│  DIDs             │  └────────────────────────────────────┘ │
│  Knowledge Bases │                                          │
│  Calls           │  ┌─ Main Content ─────────────────────┐ │
│  SMS              │  │                                    │ │
│  Webhooks        │  │  [Table / Cards / Workflow Builder] │ │
│                  │  │                                    │ │
│  ─────────       │  └────────────────────────────────────┘ │
│  API Keys        │                                          │
│  Settings        │                                          │
│                  │                                          │
│  [Admin]         │  ┌─ Footer Stats ──────────────────────┐ │
│                  │  │  Voice Agent Status • DB Health     │ │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- Desktop (1200px+): Full sidebar + content
- Tablet (768-1199px): Collapsible sidebar, icon-only mode
- Mobile (<768px): Hidden sidebar, hamburger menu

## 4. Pages & Features

### Dashboard (Overview)
- Stats cards: Total Calls Today, Active Agents, Credit Balance, Connected DIDs
- Recent calls table (last 10)
- Quick actions: Create Agent, Add DID, Buy Credits
- Voice agent status indicator (online/offline)

### Agents Page
- List/grid toggle for agents
- Agent cards with: name, voice type, status badge, call count, created date
- Create agent modal with: name, greeting, voice selection, model config
- Quick test call button

### DIDs Page
- Table of provisioned numbers: +234..., status (active/inactive), agent assigned, monthly cost
- Purchase new DID flow
- Configure DID modal

### Knowledge Bases Page
- List of knowledge bases with doc count, last updated
- Create: name, type (website/doc), URL or file upload
- Ingestion status indicator

### Calls Page
- Full call log table with: caller, duration, sentiment, disposition, recording
- Filters: date range, agent, disposition
- Click to view call detail + playback

### Settings Page
- Tabs: Profile, Voice Config, Integrations, Team
- API key management

### Admin Panel (for agency resellers)
- Tenant management
- Usage analytics across all tenants
- Global settings

## 5. Component Inventory

### Navigation
- **Sidebar**: Dark background, icon + label links, active state = green left border + bg tint
- **Header**: Page title, breadcrumbs, action buttons right-aligned

### Data Display
- **StatsCard**: Icon, label, value, trend indicator (↑↓)
- **DataTable**: Sortable columns, row hover, pagination, bulk actions
- **Badge**: Status indicators (green=active, gray=inactive, red=error)

### Forms
- **Input**: Label above, helper text below, error state with red border + message
- **Select**: Custom styled dropdown matching design system
- **Modal**: Centered, backdrop blur, slide-up animation

### Feedback
- **Toast**: Bottom-right stack, auto-dismiss 5s, success/error/info variants
- **Skeleton**: Shimmer loading for cards and tables
- **EmptyState**: Icon + message + CTA button

### Workflow Builder (Goal state, Phase 2)
- Canvas with draggable nodes
- Node types: Start, LLM, Condition, Action, End
- Connection lines between nodes
- Properties panel when node selected

## 6. Technical Approach

### Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + CSS variables
- **State**: React Context + TanStack Query
- **UI Components**: shadcn/ui-style custom components
- **Icons**: Lucide React

### Architecture
```
/app
  /layout.tsx          # Root layout with providers
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /layout.tsx         # Sidebar + header layout
    /page.tsx           # Dashboard overview
    /agents/page.tsx
    /dids/page.tsx
    /calls/page.tsx
    /knowledge-bases/page.tsx
    /settings/page.tsx
/components
  /ui/                 # Base components (Button, Input, Card, etc.)
  /layout/             # Sidebar, Header, PageWrapper
  /features/           # Domain components (AgentCard, CallTable)
/lib
  /api.ts              # API client (axios)
  /auth.ts             # Auth utilities
  /utils.ts            # cn() and helpers
/hooks
  /useAuth.ts
  /useAgents.ts
  /useCalls.ts
```

### API Integration
- Proxy to existing Call20 backend at `/api/v1/*`
- React Query for data fetching with 30s stale time
- Optimistic updates for better UX

### Deployment
- Build: `npm run build`
- Docker: Multi-stage build, Node 20 Alpine
- Env vars: API_URL, APP_URL, etc.
