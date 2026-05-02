# Call20 — Product Requirements Document
**Version:** 7.0 (Enterprise-Ready Architecture)
**Status:** Finalized for Development
**Confidentiality:** Internal / Proprietary
**Last Updated:** May 2026
**Owner:** Product & Engineering

---

## Table of Contents

1. [Document Control & Change Log](#1-document-control--change-log)
2. [Executive Summary & Vision](#2-executive-summary--vision)
3. [Problem Statement](#3-problem-statement)
4. [Target Users & Personas](#4-target-users--personas)
5. [Goals, Success Metrics & KPIs](#5-goals-success-metrics--kpis)
6. [Product Scope & Feature Inventory](#6-product-scope--feature-inventory)
7. [Comprehensive Tech Stack](#7-comprehensive-tech-stack)
8. [System Architecture](#8-system-architecture)
   - 8.1 High-Level Architecture Diagram
   - 8.2 Per-Call Session Flow (Detailed)
   - 8.3 Monitoring & Alerting Specification
9. [Detailed Feature Specifications](#9-detailed-feature-specifications)
   - 9.1 Multi-Tenant Onboarding
   - 9.2 Phone Number Provisioning
   - 9.3 AI Agent Configuration
   - 9.4 Hybrid Voice Architecture
   - 9.5 Knowledge Base & RAG Engine
   - 9.6 Agentic Tool Calling
   - 9.7 Outbound Calling
   - 9.8 Call Recording, Transcription & Storage
   - 9.9 Analytics & Reporting Dashboard
   - 9.10 Billing, Wallet & Invoicing
   - 9.11 SMS Module
   - 9.12 Human Handoff Protocol
   - 9.13 Webhook & Event System
   - 9.14 Access Control & RBAC
   - 9.15 Customer Support & Onboarding
10. [Error Handling & Fallback Logic](#10-error-handling--fallback-logic)
    - 10.4 Rate Limiting & API Throttling
11. [Multi-Tenant Data Architecture](#11-multi-tenant-data-architecture)
12. [Compliance, Security & Privacy](#12-compliance-security--privacy)
    - 12.7 Data Backup & Disaster Recovery
13. [Pricing Architecture](#13-pricing-architecture)
14. [Implementation Roadmap](#14-implementation-roadmap)
    - 14.5 Deployment & CI/CD Pipeline
15. [Acceptance Criteria](#15-acceptance-criteria)
    - 15.5 Testing Strategy
16. [Open Questions & Decisions Required](#16-open-questions--decisions-required)
17. [Risk Assessment](#17-risk-assessment)
18. [Glossary](#18-glossary)

---

## 1. Document Control & Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Founding Team | Initial concept |
| 6.0 | Apr 2026 | Product | Enterprise Architecture finalized |
| 7.0 | May 2026 | Product | Gap analysis: added personas, KPIs, error handling, outbound calling, RBAC, billing flows, analytics, webhooks, acceptance criteria |
| 7.1 | May 2026 | Product | Enhanced free credit system: configurable amount, toggle on/off, promotional coupon system, admin settings portal, bulk coupon generation, credit expiry management |

---

## 2. Executive Summary & Vision

**Call20** is an enterprise-grade, multi-tenant **Voice Operating System (Voice OS)** engineered for the African SME landscape. It enables businesses to:

1. **Provision** localized Pan-African phone numbers (NG, KE, GH, ZA) programmatically.
2. **Deploy** high-fidelity, accent-authentic AI voice agents capable of autonomous customer interaction.
3. **Integrate** those agents with real business systems — calendars, CRMs, payment rails, and messaging channels.

Call20 moves away from third-party orchestration wrappers by owning the full media stack via a proprietary Python-based pipeline (FastAPI + Pipecat). This ownership enables:

- **Voice Authenticity:** Native Nigerian, Kenyan, and South African English accent support.
- **Margin Control:** A hybrid TTS strategy (Cartesia wholesale vs. ElevenLabs BYOK) that protects profitability at scale.
- **Deep Business Integration:** An agentic tool-calling layer that executes real-world actions during live calls.

**The North Star:** An African SME should be able to deploy a fully configured AI receptionist — provisioned with a local number, trained on their website, and connected to their calendar — in under 15 minutes, without writing a single line of code.

---

## 3. Problem Statement

### 3.1 The African SME Phone Gap

African SMEs — from Nigerian fintech startups to Kenyan logistics firms — are losing revenue to:

- **Missed calls:** Limited human staffing means calls after hours or during peak periods go unanswered.
- **Accent failures:** Western AI voice products fail catastrophically on Nigerian/Kenyan accents due to STT training data bias.
- **High cost of global alternatives:** Products like Twilio Voice Intelligence or Bland.ai are priced for USD markets and unbundled in ways that are complex for African operators.
- **Integration poverty:** Most affordable IVR products in Africa provide no CRM, calendar, or payment integrations.

### 3.2 The Market Opportunity

- Nigeria alone has 41M+ registered SMEs (SMEDAN, 2023).
- Inbound call abandonment rates in African SMEs exceed 30% during peak hours.
- The African cloud communications market is projected to grow at 18.4% CAGR through 2028.

---

## 4. Target Users & Personas

### 4.1 Persona A — "The Nigerian Business Owner" (Primary Buyer)

| Attribute | Detail |
|-----------|--------|
| **Name** | Tunde, 38 |
| **Role** | Owner, mid-sized logistics company in Lagos |
| **Tech Comfort** | Moderate — uses WhatsApp Business, Google Workspace |
| **Pain** | 3 phone lines, 2 receptionists, still misses 20+ calls/day |
| **Goal** | Never miss a lead call; automate appointment booking |
| **Budget** | $50–$150/month |
| **Decision Driver** | Demo quality of the voice; local number is non-negotiable |

### 4.2 Persona B — "The Kenyan Growth Manager" (Power User)

| Attribute | Detail |
|-----------|--------|
| **Name** | Achieng, 31 |
| **Role** | Operations Manager, healthcare clinic in Nairobi |
| **Tech Comfort** | High — manages CRM, uses Zapier |
| **Pain** | Appointment no-shows, staff spending 60% of time on booking calls |
| **Goal** | AI handles all booking calls; integrate with clinic CRM |
| **Budget** | $100–$300/month |
| **Decision Driver** | Calendar and CRM integration depth; HIPAA-adjacent data handling |

### 4.3 Persona C — "The Digital Agency" (Reseller / API User)

| Attribute | Detail |
|-----------|--------|
| **Name** | Digital20 / Agency Partner |
| **Role** | Agency deploying Call20 for multiple clients |
| **Tech Comfort** | Very High — builds on APIs |
| **Pain** | White-label telephony is expensive or architecturally fragmented |
| **Goal** | White-label Call20 under own brand; manage 20+ tenant accounts |
| **Budget** | $500–$2,000/month across accounts |
| **Decision Driver** | API access, white-label support, margin structure |

### 4.4 Persona D — "The Enterprise IT Buyer" (Future / Phase 3)

| Attribute | Detail |
|-----------|--------|
| **Name** | Group IT Director, Pan-African bank |
| **Role** | Evaluating AI voice for 100+ branch network |
| **Tech Comfort** | Very High — demands SLAs and SSO |
| **Pain** | Legacy IVR is expensive to maintain; no accent accuracy |
| **Goal** | Compliant, auditable AI voice at scale |
| **Budget** | $5,000–$20,000+/month |
| **Decision Driver** | NDPR compliance, SLA guarantees, data residency, SSO/SAML |

---

## 5. Goals, Success Metrics & KPIs

### 5.1 Business Goals (12-Month Horizon)

| Goal | Metric | Target |
|------|--------|--------|
| Revenue | MRR | $50,000 by Q4 2026 |
| Adoption | Paying tenants | 300 |
| Retention | Monthly churn rate | < 5% |
| Activation | % of signups deploying agent in < 15 min | > 70% |
| Expansion | Upsell rate (Standard → BYOK) | > 20% |

### 5.2 Product KPIs

| KPI | Definition | Target |
|-----|------------|--------|
| **Time-to-First-Call (TTFC)** | Time from signup to first live AI call answered | < 15 minutes |
| **Call Answer Rate** | % of inbound calls successfully connected to AI agent | > 99.0% |
| **STT Accuracy (Nigerian English)** | Word Error Rate on Nigerian accent benchmark set | < 12% WER |
| **Agent Interruption Handling** | % of barge-in events correctly acknowledged | > 95% |
| **First-Call Resolution Rate** | % of calls resolved without human handoff | > 70% |
| **TTS Latency (Standard)** | Time from LLM token to first audio byte | < 120ms P95 |
| **TTS Latency (BYOK)** | Same as above for ElevenLabs | < 300ms P95 |
| **Transcript Delivery** | Time to post-call transcript availability | < 60 seconds |
| **Knowledge Base Ingestion** | Time to index a 50-page website | < 5 minutes |
| **Wallet Balance Accuracy** | Discrepancy between actual and billed cost | < 0.1% |

### 5.3 Reliability Targets

| Component | Uptime SLA |
|-----------|-----------|
| Telephony (DIDWW) | 99.9% |
| Pipecat Orchestrator | 99.5% |
| API Layer (FastAPI) | 99.9% |
| Dashboard | 99.5% |
| STT (Deepgram) | 99.5% |
| LLM (Gemini) | 99.0% |

---

## 6. Product Scope & Feature Inventory

### 6.1 In Scope (v1.0 Launch — Phase 1 + 2)

- [ ] Multi-tenant onboarding with workspace isolation
- [ ] African DID provisioning (NG, KE, GH, ZA)
- [ ] Inbound AI agent with STT → LLM → TTS pipeline
- [ ] Outbound calling (agent-initiated)
- [ ] Standard voice (Cartesia wholesale)
- [ ] BYOK ElevenLabs voice integration
- [ ] Voice cloning via dashboard
- [ ] Knowledge base ingestion (manual upload + Firecrawl)
- [ ] Agentic tools: calendar, CRM lookup, SMS, human handoff, voicemail recording
- [ ] Call recording, transcription, post-call summaries
- [ ] Analytics dashboard (per-tenant and admin)
- [ ] Prepaid wallet with top-up and real-time deduction
- [ ] Free trial credits (configurable amount, toggle on/off)
- [ ] Promotional coupon system (create, redeem, manage)
- [ ] Admin free credit settings portal
- [ ] Webhook event system
- [ ] Role-based access control (Owner, Admin, Agent, Viewer)
- [ ] White-label API access (agency tier)

### 6.2 Out of Scope (v1.0)

- WhatsApp Business AI integration (Phase 4)
- Native mobile apps (iOS/Android)
- Predictive dialer / power dialer
- Video calling
- HIPAA certification (Phase 3)
- SSO/SAML (Phase 3)

---

## 7. Comprehensive Tech Stack

| Layer | Component | Specification | Rationale |
|-------|-----------|---------------|-----------|
| Orchestration | Python 3.11+ / Pipecat | VAD, barge-in, real-time WebSocket session management | Full media stack ownership; no third-party wrapper |
| API Layer | FastAPI (async) | REST endpoints for dashboard and tenant management | High-performance async; native Python |
| Telephony | DIDWW | DID provisioning + SIP Trunking; G.711μ / Opus codec | Programmatic African DID catalog |
| STT | Deepgram Nova-2 | Real-time streaming; `en-NG`, `en-KE`, `en-ZA` models | Lowest WER on African English accent benchmarks |
| LLM | Gemini 1.5 Flash | Context processing, tool-call routing, multi-turn state | 1M token context window; native function calling; cost-efficient |
| Standard TTS | Cartesia (Sonic-2) | Wholesale API key; < 100ms TTFB | Ultra-low latency; margin-friendly |
| Premium TTS | ElevenLabs API | BYOK mode; user-supplied API key | Elite voice cloning; emotive prosody |
| Vector Store | Postgres 16 + pgvector | Tenant-isolated knowledge base storage | Collocated with primary DB; avoids Pinecone vendor lock |
| Web Ingestion | Firecrawl | Automated website crawling → markdown → embedding | One-click knowledge base population |
| Primary DB | Postgres 16 | All relational data (tenants, calls, billing, agents) | Single source of truth |
| Cache / Queue | Redis 7 | Session state, rate limiting, job queues | Sub-millisecond session lookups |
| File Storage | S3-compatible (MinIO on VPS) | Call recordings, voice model files | NDPR-compliant self-hosted storage |
| Background Jobs | Celery + Redis | Async tasks: ingestion, transcription, billing deduction | Decoupled from synchronous API layer |
| DevOps | Coolify / Docker Compose | Container orchestration on Ubuntu 22.04 LTS VPS | Self-hosted; NDPR geographic data residency |
| Monitoring | Prometheus + Grafana | Infrastructure and pipeline metrics | Real-time alerting |
| Log Aggregation | Loki / Grafana | Structured log collection | Correlated call-level debugging |
| Secret Management | HashiCorp Vault (or Coolify Secrets) | API keys, ElevenLabs BYOK keys, OAuth tokens | Server-side only; never exposed to browser |

---

## 8. System Architecture

### 8.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CALL20 PLATFORM                          │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────┐    │
│  │ Dashboard│    │  FastAPI     │    │  Admin Portal      │    │
│  │ (React)  │◄──►│  REST API    │◄──►│  (Internal)        │    │
│  └──────────┘    └──────┬───────┘    └────────────────────┘    │
│                         │                                       │
│                  ┌──────▼───────┐                               │
│                  │   Postgres   │                               │
│                  │  + pgvector  │                               │
│                  │  + Redis     │                               │
│                  └──────┬───────┘                               │
│                         │                                       │
│         ┌───────────────▼────────────────────┐                 │
│         │       Pipecat Orchestrator          │                 │
│         │  (Per-call session, stateful)       │                 │
│         └──┬──────────┬───────────┬───────────┘                │
│            │          │           │                             │
│     ┌──────▼──┐ ┌─────▼─────┐ ┌──▼──────────┐                 │
│     │Deepgram │ │Gemini 1.5 │ │Voice Engine │                 │
│     │Nova-2   │ │Flash      │ │Selector     │                 │
│     │(STT)    │ │(LLM/Brain)│ │             │                 │
│     └─────────┘ └─────┬─────┘ └──┬──────────┘                 │
│                        │         │                              │
│                   ┌────▼──┐  ┌───▼──────┐ ┌──────────────┐   │
│                   │Tools  │  │Cartesia  │ │ElevenLabs    │   │
│                   │Layer  │  │(Standard)│ │(BYOK Premium)│   │
│                   └───┬───┘  └──────────┘ └──────────────┘   │
│                       │                                        │
│          ┌────────────┼────────────────┐                      │
│          │            │                │                       │
│    ┌─────▼──┐  ┌──────▼───┐  ┌────────▼────┐                 │
│    │Google  │  │CRM       │  │DIDWW SMS    │                 │
│    │Calendar│  │Lookup    │  │API          │                 │
│    └────────┘  └──────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
         ▲                               │
         │                               ▼
   ┌─────┴──────┐               ┌────────────────┐
   │  DIDWW     │               │  DIDWW SIP     │
   │  DID Mgmt  │               │  Trunk Gateway │
   └────────────┘               └────────┬───────┘
                                          │
                                   [Inbound Caller]
```

### 8.2 Per-Call Session Flow (Detailed)

```
graph TD
    A[PSTN Call → DIDWW] --> B[SIP Trunk Gateway]
    B --> C{DID Routing Table}
    C -- "tenant_id lookup" --> D[Pipecat Session Spawn]
    D --> E[Load Tenant Config from Redis]
    E --> F[Greet Caller: TTS playback]

    F --> G[VAD: Silence Detection Active]
    G --> H{Barge-in?}
    H -- "Yes" --> I[Kill TTS Stream]
    I --> J[Deepgram STT: Streaming Transcript]
    H -- "No" --> G

    J --> K[Transcript Chunk → Gemini 1.5 Flash]
    K --> L{LLM Intent Classification}

    L -- "Knowledge Query" --> M[pgvector RAG Retrieval]
    M --> K

    L -- "Tool Call Required" --> N[Tool Dispatcher]
    N --> O{Tool Type}
    O -- "calendar" --> P[Google/Outlook API]
    O -- "crm" --> Q[CRM API Lookup]
    O -- "sms" --> R[DIDWW SMS API]
    O -- "handoff" --> S[Transfer to Human Agent SIP]

    L -- "Conversational Response" --> T[LLM Response Text]
    P --> T
    Q --> T
    R --> T

    T --> U{Voice Engine Selector}
    U -- "Standard" --> V[Cartesia Sonic-2 TTS]
    U -- "BYOK" --> W[ElevenLabs TTS]

    V --> X[Full-Duplex Audio Stream → DIDWW]
    W --> X

    X --> Y{Call End?}
    Y -- "Yes" --> Z[Post-Call Processing]
    Y -- "No" --> G

    Z --> AA[Store Recording to MinIO]
    Z --> AB[Generate Transcript via Deepgram]
    Z --> AC[LLM: Call Summary + Sentiment]
    Z --> AD[Deduct Wallet Balance]
    Z --> AE[Trigger Webhook Event: call.completed]
```

### 8.3 Monitoring & Alerting Specification

Call20 utilizes a Prometheus + Grafana stack for real-time observability.

#### 8.3.1 Metrics to Track

| Category | Metric Name | Source | Alert Threshold |
|----------|-------------|--------|-----------------|
| **System** | `cpu_usage_percent` | Node Exporter | > 80% for 5 min |
| **System** | `ram_usage_percent` | Node Exporter | > 85% |
| **System** | `disk_io_wait` | Node Exporter | > 10% |
| **API** | `http_request_duration_seconds` | FastAPI / Prometheus | P95 > 500ms |
| **API** | `http_requests_total{status=~"5.."}` | FastAPI | > 1% of traffic |
| **Voice** | `pipeline_latency_ms` | Pipecat | P95 > 250ms |
| **Voice** | `stt_wer_estimate` | Deepgram API | > 15% on sample |
| **Voice** | `concurrent_calls_count` | Redis | > 90% of capacity |
| **Billing** | `wallet_deduction_failure_total` | Celery | > 0 (Immediate) |
| **Billing** | `payment_webhook_errors` | FastAPI | > 0 (Immediate) |

#### 8.3.2 Escalation Paths

1. **L1 (Warning):** Slack notification to `#ops-alerts`.
2. **L2 (Critical):** PagerDuty / OpsGenie call to on-call engineer.
3. **L3 (Fatal):** Automatic service restart + CTO notification.

#### 8.3.3 Operations Dashboards

- **Global Health:** Real-time uptime of all external providers (DIDWW, Deepgram, Gemini).
- **Tenant Performance:** Drill-down per tenant to see their specific call success rates.
- **Infrastructure:** Resource consumption across the VPS cluster.

---

## 9. Detailed Feature Specifications

### 9.1 Multi-Tenant Onboarding

#### 9.1.1 Self-Service Signup Flow

**Step 1: Registration**
- Fields: Full name, business name, business email, phone number, country (dropdown: NG, KE, GH, ZA, Other)
- Email verification required before dashboard access.
- On verification: `tenant_id` generated (UUID v4), workspace created, default wallet balance set to $0.

**Step 2: Business Profile**
- Business category (dropdown): Logistics, Healthcare, Real Estate, Legal, Hospitality, Retail, Financial Services, Other
- Business hours configuration (timezone + operating hours per day)
- Logo upload (for dashboard branding)

**Step 3: Guided Setup Wizard ("The 3-Step Launch")**

| Step | Action | Estimated Time |
|------|--------|----------------|
| 1. Get a Number | Select country → browse available DIDs → purchase | 2 min |
| 2. Train Your Agent | Enter website URL OR upload documents | 5 min |
| 3. Configure Agent Voice | Pick preset voice OR upload custom voice sample | 3 min |

> **Acceptance Criterion:** A user who completes all 3 steps must be able to receive a live AI-handled inbound call within 15 minutes of account creation.

#### 9.1.2 Onboarding Email Sequence

| Email | Trigger | Content |
|-------|---------|---------|
| Welcome | Signup | Credentials, quick-start guide link |
| Number Confirmed | DID provisioned | Number details, test call instructions |
| Agent Live | First call answered | Summary of first call, dashboard link |
| 3-Day Check-in | 3 days post-signup | Feature tips, upgrade prompt if on free tier |

---

### 9.2 Phone Number Provisioning

#### 9.2.1 DID Catalog & Purchase Flow

- **API Source:** DIDWW `/v3/dids` catalog endpoint, polled and cached in Redis (TTL: 15 minutes)
- **Supported Regions at Launch:** Nigeria (+234), Kenya (+254), Ghana (+233), South Africa (+27)
- **Number Types:** Local (geographic), Mobile, Toll-Free (where available per country)
- **Display Fields:** Number, country, city/region, monthly rental cost (USD), setup fee, available SMS capability (boolean)

**Purchase Flow:**
1. Tenant selects a number from filtered catalog.
2. Call20 backend executes `POST /v3/orders` to DIDWW with tenant's payment cleared.
3. DID is provisioned and assigned to `tenant_id` in the routing table.
4. SIP URI is automatically mapped to a Pipecat worker pool slot designated for the tenant's agent config.
5. Tenant receives in-dashboard confirmation + email notification.

**Error States:**
| Error | Cause | Handling |
|-------|-------|---------|
| `DID_UNAVAILABLE` | Number sold between catalog refresh and order | Show alternate numbers; refresh catalog |
| `INSUFFICIENT_BALANCE` | Wallet < DID monthly rental | Prompt wallet top-up |
| `DIDWW_API_TIMEOUT` | External API unavailable | Retry 3x with exponential backoff; surface error to user |

#### 9.2.2 Number Management

- Tenants can hold multiple DIDs under one account.
- Each DID is mapped to exactly one AI agent configuration.
- DID reassignment (point existing DID to different agent config) is allowed via dashboard.
- **Number Porting:** Not supported in v1.0. Tenants must provision new DIDs. Porting is flagged as a Phase 3 feature.
- **Renewal:** DIDs auto-renew monthly; tenant is notified 7 days and 1 day before renewal. Failed renewal results in a 48-hour grace period before DID release.

#### 9.2.3 DIDWW Failover Strategy

- Call20 maintains a **secondary SIP trunk** (failover provider TBD — Vonage or Telnyx) for automatic failover.
- Failover trigger: DIDWW SIP endpoint non-responsive for > 30 seconds.
- Failover is transparent to callers.
- Failover events are logged and trigger an internal alert (PagerDuty / email to engineering).

---

### 9.3 AI Agent Configuration

#### 9.3.1 Agent Config Schema

Each tenant's agent is defined by a configuration object stored in Postgres (`agent_configs` table):

```json
{
  "agent_id": "uuid",
  "tenant_id": "uuid",
  "name": "Amara - Sales Assistant",
  "persona_prompt": "You are Amara, a friendly and professional receptionist for Apex Logistics Lagos...",
  "greeting_message": "Good day, you've reached Apex Logistics. My name is Amara, how may I help you?",
  "language": "en-NG",
  "voice_engine": "cartesia",
  "voice_id": "cartesia_voice_uuid",
  "tools_enabled": ["check_calendar", "book_appointment", "trigger_sms", "handoff_to_human"],
  "knowledge_base_ids": ["kb_uuid_1"],
  "business_hours": {
    "timezone": "Africa/Lagos",
    "schedule": {
      "monday": { "open": "08:00", "close": "18:00" },
      "friday": { "open": "08:00", "close": "17:00" },
      "saturday": { "open": "09:00", "close": "13:00" },
      "sunday": null
    }
  },
  "after_hours_behavior": "voicemail",
  "max_call_duration_seconds": 600,
  "sentiment_handoff_threshold": 0.3,
  "fallback_phone": "+2348012345678",
  "recording_enabled": true,
  "pii_redaction_enabled": true
}
```

#### 9.3.2 Persona Prompt Builder

- Dashboard provides a structured form that generates the `persona_prompt`:
  - Agent name
  - Business name and description
  - Agent's role (receptionist, sales, support, booking agent)
  - Tone (formal, friendly, professional)
  - Topics the agent should NOT discuss (blocklist)
  - Escalation rules (e.g., "If caller mentions refund, transfer to human")
- Advanced mode: Raw system prompt editor (for agency/API users)

#### 9.3.3 Language & Accent Configuration

| Language Code | Description | STT Model |
|---------------|-------------|-----------|
| `en-NG` | Nigerian English | Deepgram Nova-2 `en-NG` |
| `en-KE` | Kenyan English | Deepgram Nova-2 `en-KE` |
| `en-ZA` | South African English | Deepgram Nova-2 `en-ZA` |
| `en-GH` | Ghanaian English | Deepgram Nova-2 `en-GH` (or `en-NG` fallback) |

> **Note on Code-Switching:** Nigerian callers frequently switch between English and Pidgin, or English and Yoruba/Igbo/Hausa. Deepgram's `en-NG` model handles this partially. Phase 2 will evaluate Whisper large-v3 fine-tuned on Naija Pidgin as a complementary layer.

#### 9.3.4 Gemini Context Window Management

Gemini 1.5 Flash has a 1M token context window, but per-call context is managed as follows to control cost and latency:

- **System Prompt:** Tenant persona prompt + tool definitions (loaded once per session from Redis cache)
- **RAG Injection:** Retrieved knowledge base chunks (top-3 by cosine similarity) injected per turn
- **Conversation History:** Full turn-by-turn history retained in session memory (Pipecat's in-memory state)
- **Context Pruning:** If conversation exceeds 40 turns, oldest 10 turns are summarized by a lightweight LLM call and the raw turns are dropped
- **Token Budget:** Per-call LLM cost is capped at 200K tokens; if exceeded, agent gracefully offers to continue via SMS or callback

---

### 9.4 Hybrid Voice Architecture

#### 9.4.1 Engine A: Standard (Cartesia Sonic-2)

- **Credential:** Call20 wholesale Cartesia API key (server-side only)
- **Latency Target:** < 120ms TTFB (Time To First Byte) P95
- **Voice Catalog:** Pre-built African accent voices curated by Call20 (Nigerian Female Professional, Nigerian Male Professional, Kenyan Female, etc.)
- **Zero-Shot Cloning:** Tenants can upload a 30-second voice sample; Cartesia generates a cloned voice_id stored against the tenant's account
- **Cloning Ownership:** Cloned voice IDs are scoped to `tenant_id` and are never shared across tenants

**Voice Cloning UX Flow:**
1. Tenant navigates to: Dashboard → Agent Settings → Voice → Clone a New Voice
2. Upload requirements displayed: 30–60 seconds, WAV or MP3, single speaker, no background noise
3. File uploaded → Celery job submits to Cartesia clone endpoint → polls until ready (typically < 2 min)
4. On completion: voice appears in tenant's private voice library
5. Tenant selects cloned voice and saves agent config

#### 9.4.2 Engine B: Premium (ElevenLabs BYOK)

- **Credential Handling:** Tenant enters their ElevenLabs API key in Settings → Integrations → ElevenLabs
- **Key Storage:** Encrypted at rest using AES-256 in Vault/Coolify Secrets; never exposed client-side
- **Voice Library Sync:** On key save, Call20 calls `GET /v1/voices` on the ElevenLabs API using the tenant's key and caches the voice list in Postgres
- **Billing Impact:** TTS synthesis costs charged to tenant's personal ElevenLabs account. Call20 deducts only Telephony + STT + LLM from the wallet
- **Latency Target:** < 300ms TTFB P95 (ElevenLabs latency is inherently higher)
- **Streaming Mode:** Uses ElevenLabs streaming API (`/v1/text-to-speech/{voice_id}/stream`) to begin audio playback before full synthesis completes

#### 9.4.3 Voice Engine Selector Logic

```python
def select_voice_engine(agent_config: AgentConfig, tenant: Tenant) -> VoiceEngine:
    if agent_config.voice_engine == "elevenlabs":
        if tenant.elevenlabs_api_key is None:
            # Fallback: notify admin, use Cartesia standard
            log_warning("ElevenLabs BYOK key missing; falling back to Cartesia")
            return VoiceEngine.CARTESIA
        return VoiceEngine.ELEVENLABS
    return VoiceEngine.CARTESIA
```

#### 9.4.4 Barge-In (Interruption) Handling

- **VAD Engine:** Pipecat's built-in VAD (WebRTC VAD or Silero VAD) detects caller speech onset
- **Interrupt Threshold:** Speech confidence > 0.7 for > 200ms triggers barge-in
- **Actions on Barge-In:**
  1. Send `KILL` signal to active TTS stream (both Cartesia and ElevenLabs have streaming abort mechanisms)
  2. Flush audio buffer
  3. Begin new STT stream for caller's new utterance
  4. Acknowledge caller's interruption in the next LLM turn via system instruction: `"The caller just interrupted you. Respond to their interruption without completing your previous sentence."`

---

### 9.5 Knowledge Base & RAG Engine

#### 9.5.1 Ingestion Sources

| Source | Method | Detail |
|--------|--------|--------|
| Website URL | Firecrawl crawl job | Crawls up to 100 pages; respects `robots.txt`; extracts clean markdown |
| PDF Upload | PyMuPDF + chunker | Extracts text, splits into 512-token chunks with 50-token overlap |
| DOCX Upload | python-docx | Extracts structured content |
| Plain Text | Direct paste in dashboard | No processing required |
| FAQ Builder | Structured Q&A pairs in dashboard | Highest-priority retrieval source |

#### 9.5.2 Embedding & Storage

- **Embedding Model:** `text-embedding-3-small` (OpenAI) or `textembedding-gecko` (Google) — to be finalized in architecture review
- **Chunk Size:** 512 tokens, 50-token overlap
- **Metadata per Chunk:** `tenant_id`, `kb_id`, `source_url`, `page_number`, `ingested_at`
- **Retrieval:** Cosine similarity search; top-3 chunks returned per query; similarity threshold: > 0.72 (below threshold → agent acknowledges it doesn't have that information)
- **Isolation:** `tenant_id` is always part of the `WHERE` clause in pgvector queries — no cross-tenant data leakage is architecturally possible

#### 9.5.3 Firecrawl Ingestion Flow

1. Tenant enters website URL → submits ingestion job
2. Celery job created: `ingest_website` task
3. Firecrawl crawl initiated: `POST /crawl` with `{ url, limit: 100, scrapeOptions: { formats: ["markdown"] } }`
4. Polling loop (every 10 seconds) until `status: completed`
5. Markdown content chunked, embedded, and upserted to pgvector
6. Dashboard shows ingestion progress bar + page count
7. On completion: "Knowledge Base ready — 73 pages indexed"

**Re-crawl Scheduling:**
- Default: Manual re-crawl only
- Optional: Tenant can enable weekly auto re-crawl
- On re-crawl: existing chunks for that `kb_id` are deleted and replaced (full re-index, not delta update)

**Conflict Resolution:**
- If two knowledge base sources contain contradictory information, the LLM is instructed: "If retrieved context contains contradictions, acknowledge uncertainty and offer to connect the caller with a human."

---

### 9.6 Agentic Tool Calling

All tools are Python functions registered in the Gemini 1.5 Flash function-calling schema. The LLM emits a `tool_call` JSON object; Pipecat's tool dispatcher executes the corresponding function and returns the result to the LLM.

#### 9.6.1 Tool Definitions

**Tool 1: `check_calendar`**

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Query Google Calendar or Outlook for available appointment slots |
| **Inputs** | `requested_date: str (YYYY-MM-DD)`, `duration_minutes: int`, `timezone: str` |
| **Output** | `{ available_slots: ["10:00", "14:30", "16:00"] }` |
| **Auth** | OAuth 2.0 token stored encrypted per tenant |
| **Error Handling** | If auth token expired → agent says "Let me check that for you, one moment" while refresh attempted; if refresh fails → inform caller to book via website |
| **Timeout** | 5 seconds; on timeout → fallback response: "I'm having trouble accessing the calendar right now" |

**Tool 2: `book_appointment`**

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Create a confirmed calendar event and send invite to caller |
| **Inputs** | `date: str`, `time: str`, `duration_minutes: int`, `caller_name: str`, `caller_phone: str`, `caller_email: str (optional)`, `notes: str` |
| **Output** | `{ event_id: str, confirmation_number: str, invite_sent: bool }` |
| **Actions** | Creates Google/Outlook event; sends SMS confirmation via `trigger_sms` tool |
| **Timeout** | 8 seconds |
| **Duplicate Check** | Queries existing events for same slot before booking |

**Tool 3: `lookup_customer`**

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Search CRM for caller history using Caller ID |
| **Inputs** | `phone_number: str (E.164 format)` |
| **Output** | `{ customer_id, name, last_interaction, open_tickets, account_status }` or `{ found: false }` |
| **Supported CRMs** | HubSpot, Zoho CRM (v1.0); Salesforce, Pipedrive (Phase 2) |
| **Auth** | CRM OAuth token or API key per tenant |
| **PII Handling** | CRM data is used for in-session personalization only; not stored in Call20 logs unless recording is enabled and consent is obtained |

**Tool 4: `trigger_sms`**

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Send SMS to caller during or after the call |
| **Inputs** | `to: str (E.164)`, `message: str (< 160 chars)`, `template_id: str (optional)` |
| **Output** | `{ sms_id: str, status: "queued" \| "failed" }` |
| **API** | DIDWW SMS API (same provider as telephony) |
| **Rate Limits** | Max 3 SMS per call session to prevent abuse |
| **Opt-Out** | SMS messages include "Reply STOP to opt out"; opt-outs are stored and respected |

**Tool 5: `handoff_to_human`**

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Transfer live call to a human agent |
| **Inputs** | `reason: str`, `urgency: "normal" \| "high"`, `transfer_to: str (E.164 SIP URI)` |
| **Trigger Conditions** | (a) Agent explicitly requested by caller 3+ times; (b) LLM sentiment score < threshold; (c) Query categorized as out-of-scope; (d) Explicit caller request |
| **Transfer Mechanism** | SIP REFER transfer via DIDWW; bridge remains active until human picks up |
| **Fallback** | If human doesn't answer within 20 rings → return caller to AI or offer voicemail |
| **Pre-transfer Briefing** | A text summary of the call so far is sent to human agent's dashboard before transfer completes |

**Tool 6: `record_voicemail`** *(new)*

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Prompt caller to leave a voicemail when agent or human unavailable |
| **Inputs** | `after_hours: bool`, `max_duration_seconds: int (default: 120)` |
| **Output** | Recording saved to MinIO; transcript generated; email notification sent to tenant |
| **Trigger** | After-hours calls OR failed human handoff |

#### 9.6.2 Sentiment Analysis

- Gemini analyzes sentiment on every LLM turn (implicit, via the system prompt)
- Sentiment score: 0.0 (extremely distressed) → 1.0 (very positive)
- If score < `sentiment_handoff_threshold` (default: 0.3) for 2 consecutive turns → `handoff_to_human` tool is automatically triggered
- Tenant can configure threshold in agent settings

---

### 9.7 Outbound Calling

#### 9.7.1 Outbound Call Types

| Type | Description | Use Case |
|------|-------------|---------|
| **Scheduled Callback** | System calls a contact at a pre-set time | Appointment reminders, follow-ups |
| **API-Triggered Outbound** | Tenant's system calls Call20 API to initiate a call | CRM-triggered outreach |
| **Bulk Campaign** | Tenant uploads a contact list; system calls sequentially | Announcements, surveys |

#### 9.7.2 Outbound Call Specification

- **Initiator:** `POST /api/v1/calls/outbound`
- **Payload:**
  ```json
  {
    "to": "+2348012345678",
    "agent_id": "uuid",
    "context": {
      "caller_name": "Chidi",
      "purpose": "appointment_reminder",
      "appointment_time": "2026-05-10 10:00 WAT"
    }
  }
  ```
- **Context Injection:** The `context` object is injected into the agent's system prompt for that call
- **DID Used for Outbound:** The tenant's provisioned DID (or a separate outbound DID if configured)
- **Compliance:** Nigerian NCC regulations prohibit unsolicited automated outbound calls. Tenants must confirm contact consent at account setup. Call20 is not liable for tenant misuse; ToS enforcement applies.
- **Answering Machine Detection (AMD):** Detect if call goes to voicemail; if so, agent can leave a pre-recorded or TTS-generated voicemail message, then hang up
- **Retry Logic:** Up to 2 retries if no answer; retry interval: 30 minutes minimum

#### 9.7.3 Bulk Campaign Limits

| Plan | Max Contacts/Campaign | Max Concurrent Outbound Calls |
|------|-----------------------|-------------------------------|
| Starter | 100 | 2 |
| Growth | 500 | 5 |
| Scale | 2,000 | 15 |
| Enterprise | Unlimited | Negotiated |

---

### 9.8 Call Recording, Transcription & Storage

#### 9.8.1 Recording

- Recording is enabled/disabled at the agent configuration level.
- **Format:** WAV (G.711 decoded) or MP3 (compressed for storage)
- **Storage:** MinIO (self-hosted S3-compatible), organized as: `/{tenant_id}/calls/{year}/{month}/{call_id}.mp3`
- **Retention Period:** Default 90 days; configurable by tenant (30 / 90 / 365 days); Enterprise: custom
- **Access:** Tenant can play back, download, or delete any recording from the dashboard
- **Deletion on Request:** GDPR/NDPR right-to-erasure; recording + transcript deleted within 24 hours of request

#### 9.8.2 Transcription

- **Provider:** Deepgram (post-call batch transcription using the same Nova-2 model)
- **Format:** JSON with word-level timestamps + speaker diarization (identifies Caller vs. Agent)
- **Delivery:** Available in dashboard within 60 seconds of call completion
- **Search:** Full-text search across transcripts within the dashboard (indexed in Postgres)
- **Export:** CSV or JSON export of transcript + metadata (call duration, sentiment score, tools triggered)

#### 9.8.3 Post-Call Summary

- After every call, a Celery background job runs an LLM prompt against the full transcript:
  ```
  Summarize this call in 3 bullet points. Identify: (1) the caller's main request,
  (2) how the agent resolved it, (3) any follow-up actions required.
  Return JSON: { summary: str, resolution: "resolved" | "escalated" | "unresolved", followup: str }
  ```
- Summary displayed in the Call Log dashboard view
- If `followup` is non-empty, tenant receives an email/in-app notification

---

### 9.9 Analytics & Reporting Dashboard

#### 9.9.1 Tenant Analytics Dashboard

**Overview Metrics (Homepage)**

| Metric | Description |
|--------|-------------|
| Total Calls (period) | Count of inbound + outbound calls |
| Total Duration | Sum of all call durations |
| Calls Answered by AI | Count where AI handled end-to-end |
| Human Handoff Rate | % of calls transferred to human |
| Average Call Duration | Mean duration across all calls |
| Wallet Balance | Current prepaid balance |
| Monthly Spend | USD spent in current billing period |

**Call Log View**

- Filterable by: date range, agent, DID, resolution status, sentiment score
- Per-call row shows: timestamp, duration, DID, caller ID (masked), resolution, sentiment badge, tools triggered, recording player, transcript viewer
- Bulk export: CSV

**Sentiment Trend Chart**
- Line chart: Average sentiment score per day over 30 days
- Helps tenants identify if their business is receiving a spike in distressed callers

**Agent Performance**

| Metric | Description |
|--------|-------------|
| FCR Rate | First-Call Resolution rate |
| Barge-in Rate | % of turns where caller interrupted AI |
| Knowledge Base Hit Rate | % of RAG queries that returned relevant chunks |
| Tool Usage Breakdown | How often each tool was invoked |

#### 9.9.2 Admin (Internal) Analytics

- Cross-tenant: total calls, total minutes, total revenue, churn risk flags
- Infrastructure: Pipecat session counts, Deepgram API error rates, Gemini token consumption
- Billing audit log: every wallet deduction with cost breakdown

#### 9.9.3 Analytics Implementation Detail

- **Real-Time Metrics:** In-session metrics (current concurrent calls, live sentiment) are stored in Redis for sub-millisecond dashboard updates.
- **Batch Processing:** Daily Celery jobs aggregate raw call data into `daily_tenant_metrics` table for fast historical charting.
- **Data Retention:**
  - **Starter:** 7 days of granular logs; 30 days of aggregates.
  - **Growth/Scale:** 90–365 days of granular logs; lifetime aggregates.
- **Exports:** CSV (Standard), JSON/Parquet (Enterprise via S3).
- **Custom Reports:** Scale tier includes a basic query builder for custom metric grouping (e.g., "Calls by City vs Tool Usage").

---

### 9.10 Billing, Wallet & Invoicing

#### 9.10.1 Wallet Mechanics

- Each tenant has a single USD prepaid wallet.
- **Minimum Top-Up:** $10
- **Top-Up Methods:** Paystack (Naira card, bank transfer), Stripe (USD card), manual invoice (Enterprise)
- **Auto Top-Up:** Tenant can set a threshold (e.g., wallet < $5 → auto-charge $20 from saved card)
- **Low Balance Warning:** Push notification + email at 20% of average weekly spend, and again when balance < $2

#### 9.10.2 Real-Time Cost Deduction

Cost is calculated **per call**, deducted at call completion (not mid-call, to avoid fractional accounting errors):

```
Total_Cost_USD =
    DID_Inbound_Rate_per_min × call_duration_min
  + STT_Cost_per_min × call_duration_min
  + LLM_Cost_per_token × tokens_used
  + [Cartesia_TTS_cost_per_char × chars_synthesized]  ← Standard plan only
  + Call20_Margin
```

- Deduction is atomic (database transaction); if deduction fails, call is flagged for manual reconciliation.
- Wallet is checked **before** call is answered: if balance is $0 and auto top-up is disabled, the call receives an "out-of-service" message.

#### 9.10.3 Cost Reference Table (Estimated USD, May 2026)

| Component | Wholesale Cost | Passed to Tenant? |
|-----------|---------------|-------------------|
| DIDWW Inbound (NG) | ~$0.012/min | Yes, within formula |
| Deepgram Nova-2 | ~$0.0059/min | Yes |
| Gemini 1.5 Flash | ~$0.075/1M tokens input | Yes |
| Cartesia Sonic-2 | ~$0.015/min equiv. | Yes (Standard plan) |
| ElevenLabs | User's own account | No (BYOK) |
| Call20 Margin | Variable | Implicit in retail rate |

#### 9.10.4 Subscription Plans

| Feature | Starter (Free) | Growth ($49/mo) | Scale ($149/mo) | Enterprise (Custom) |
|---------|-----------------|-----------------|-----------------|---------------------|
| DIDs | 1 | 3 | 10 | Unlimited |
| AI Minutes included | 0 (pay-per-use) + $10 free credit | 200 min/mo | 600 min/mo | Negotiated |
| Overage rate | $0.35/min | $0.28/min | $0.22/min | Custom |
| Agents | 1 | 3 | 10 | Unlimited |
| Knowledge Bases | 1 (50 pages) | 5 (200 pages each) | Unlimited | Unlimited |
| BYOK ElevenLabs | ✗ | ✓ | ✓ | ✓ |
| Analytics Retention | 7 days | 90 days | 365 days | Custom |
| Webhook Events | ✗ | ✓ | ✓ | ✓ |
| API Access | ✗ | ✗ | ✓ | ✓ |
| White-Label | ✗ | ✗ | ✗ | ✓ |
| SLA | None | 99.5% | 99.9% | Custom |
| Support | Community | Email (48h) | Priority (8h) | Dedicated CSM |

#### 9.10.5 Invoicing

- Monthly invoice generated on 1st of each month for the prior month's usage.
- Invoice format: PDF, downloadable from dashboard.
- Invoice line items: Subscription fee, included minutes used, overage minutes, DID rentals, platform fees, taxes (if applicable).

---

### 9.11 SMS Module

- **Inbound SMS:** DIDWW routes inbound SMS to a webhook; Call20 logs the message and triggers a Celery job that generates an AI response using the tenant's agent configuration. Response delivered via DIDWW SMS API.
- **Outbound SMS:** Triggered by `trigger_sms` tool or directly via tenant dashboard.
- **Templates:** Tenants can create up to 20 named SMS templates (appointment confirmation, reminder, receipt, custom).
- **Character Limit:** 160 characters per SMS; multi-part SMS supported (up to 3 parts = 480 chars).
- **Opt-Out Management:** Call20 maintains an opt-out list per tenant. SMS to opted-out numbers are silently dropped and logged.
- **Pricing:** Included in per-minute wallet deduction for call-triggered SMS. Standalone SMS charged at $0.05/SMS (NG) and $0.04/SMS (KE/GH/ZA).

---

### 9.12 Human Handoff Protocol

#### 9.12.1 Handoff Trigger Matrix

| Trigger | Condition | Agent Behavior Before Transfer |
|---------|-----------|-------------------------------|
| Explicit caller request | Caller says "let me speak to a person" / "I want a human" | "Of course, let me connect you now. Please hold." |
| Sentiment threshold | Score < 0.3 for 2 consecutive turns | "I can sense this is important. Let me connect you with a colleague who can help immediately." |
| Out-of-scope query | Topic classification confidence < 0.5 on 2 consecutive queries | "That's a great question. I want to make sure you get the right answer — let me get a specialist for you." |
| Agent loop detection | Same query rephrased 3+ times without resolution | Auto-trigger, no agent speech |
| Emergency keyword | "emergency", "urgent", "dying" | Immediate transfer; agent says "I'm connecting you to someone right now." |

#### 9.12.2 Transfer Execution

1. Agent says handoff phrase (if applicable)
2. `handoff_to_human` tool called with `transfer_to` SIP URI
3. Hold music played to caller
4. **Context Brief** sent to human agent dashboard: caller name, reason for call, sentiment score, key information captured, tools triggered, link to live transcript
5. SIP REFER executed to agent's SIP phone/extension
6. If human doesn't answer in 20 rings (~60 seconds): caller offered option to leave voicemail OR have AI continue
7. Call recording continues throughout transfer

#### 9.12.3 Multi-Agent Routing (Future — Phase 3)

- Tenants can define a routing table: different DIDs route to different AI agents
- Human handoff can route to specific agents based on topic (e.g., billing queries → billing team SIP extension)

---

### 9.13 Webhook & Event System

#### 9.13.1 Event Types

| Event Name | Trigger | Payload Includes |
|------------|---------|-----------------|
| `call.inbound.started` | Inbound call connected to AI | call_id, from, to, timestamp |
| `call.outbound.started` | Outbound call initiated | call_id, to, agent_id, timestamp |
| `call.ended` | Call disconnected (any party) | call_id, duration, resolution, sentiment_score |
| `call.handoff.initiated` | Human handoff triggered | call_id, reason, transfer_to |
| `call.handoff.completed` | Human picked up | call_id, human_agent_id |
| `tool.triggered` | Any agent tool invoked | call_id, tool_name, input, output |
| `sms.sent` | SMS dispatched | sms_id, to, status |
| `kb.ingestion.completed` | Firecrawl job finished | kb_id, pages_indexed, duration |
| `wallet.low_balance` | Balance crosses warning threshold | tenant_id, balance, threshold |
| `wallet.depleted` | Balance reaches $0 | tenant_id |
| `did.renewal.failed` | DID auto-renewal failed | did_id, number, reason |

#### 9.13.2 Webhook Configuration

- Tenant configures up to 5 webhook endpoints (URL + secret header) in dashboard
- Delivery: HTTPS POST with JSON payload + `X-Call20-Signature` HMAC header for verification
- Retry: Up to 5 retries with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Delivery log: Last 200 webhook delivery attempts visible in dashboard with status codes
- Failure handling: If endpoint is unreachable for > 24 hours, webhook is auto-disabled and tenant is notified

---

### 9.14 Access Control & RBAC

#### 9.14.1 Role Definitions

| Role | Permissions |
|------|-------------|
| **Owner** | Full access; billing management; team management; API key generation |
| **Admin** | All operational access; cannot manage billing or delete workspace |
| **Agent Manager** | Create/edit/delete agent configs; view call logs; manage knowledge bases |
| **Viewer** | Read-only access to analytics and call logs; no configuration changes |
| **API Key (Headless)** | Scoped programmatic access; permissions defined at key creation |

#### 9.14.2 Multi-User Workspace

- Owner can invite team members by email; invitees receive onboarding email
- Role is assigned at invite time; changeable by Owner only
- Session management: JWT-based authentication; access tokens expire in 8 hours; refresh tokens expire in 30 days
- 2FA: TOTP-based (Google Authenticator / Authy) — optional for Growth, mandatory for Enterprise

#### 9.14.3 API Key Management

- Tenants on Scale/Enterprise plan can generate API keys
- Keys are scoped (read-only, read-write, full)
- Keys are shown once at creation; thereafter only the last 4 characters are visible
- Keys can be revoked instantly from dashboard

### 9.15 Customer Support & Onboarding

#### 9.15.1 Support Channels

- **Ticketing:** Integrated Zendesk widget in the dashboard.
- **Knowledge Base:** Public docs at `docs.call20.ai` with video tutorials.
- **Live Chat:** Growth/Scale plans include Intercom live chat during WAT business hours.

#### 9.15.2 Onboarding Experience

- **In-App Tours:** Interactive walkthrough for first-time login (Step-by-step: Create Agent → Buy DID → Test Call).
- **Success Milestones:** Badge/Credit awards for completing training (e.g., "Knowledge Guru" badge after first 100 pages ingested).

#### 9.15.3 Success Metrics (CSAT/NPS)

- Post-call NPS survey sent to tenant after first 10 successful AI calls.
- Quarterly CSAT surveys for Scale/Enterprise tiers.

---

## 10. Error Handling & Fallback Logic

### 10.1 Component Failure Matrix

| Failed Component | Detection | Caller Experience | Recovery Action |
|------------------|-----------|-------------------|-----------------|
| **Deepgram STT** | HTTP 5xx / timeout > 3s | "I'm having a little trouble hearing you. Could you repeat that?" | Retry 2x; if still failing, route to human handoff |
| **Gemini LLM** | HTTP 5xx / timeout > 8s | "One moment while I look into that for you." | Retry 1x; if failing, use cached fallback response: "I'm experiencing a technical issue. Let me connect you with a team member." |
| **Cartesia TTS** | HTTP 5xx / timeout > 2s | Silence (caller hears nothing) | Switch to ElevenLabs (if BYOK configured) or to pre-recorded MP3 fallback phrases |
| **ElevenLabs TTS** | HTTP 5xx / timeout > 5s | Silence | Switch to Cartesia standard engine |
| **DIDWW SIP** | SIP 5xx / no response | Caller cannot connect | Activate failover SIP trunk; alert engineering |
| **Postgres DB** | Connection refused | All new call sessions fail | Redis-cached agent configs serve existing calls; alert engineering; read replicas take over |
| **Pipecat Worker** | OOM / crash | Caller disconnected | Kubernetes/Docker restart policy; call logged as `failed`; tenant notified if recurring |
| **Calendar API (OAuth)** | Token expired / 401 | "I couldn't access the calendar right now." | Attempt token refresh; if fail, offer to take callback number instead |
| **Firecrawl** | Job timeout / 5xx | Ingestion stuck | Job marked failed after 30 min; tenant notified; manual upload option offered |

### 10.2 Dead-Air Prevention

- If Gemini LLM response takes > 2 seconds, Pipecat injects a **filler phrase** to prevent silence:
  - "Let me check on that for you..."
  - "One moment..."
  - "I'm looking that up now..."
  - Filler phrases are randomized to avoid robotic repetition

### 10.3 Call Completion Guarantee

- If a call ends abnormally (e.g., Pipecat crash mid-call), a cleanup job detects orphaned sessions and:
  - Calculates partial cost based on estimated duration
  - Writes a `call.ended` event with `reason: "abnormal_termination"`
  - Deducts wallet appropriately
  - Flags call in dashboard as "Incomplete"

### 10.4 Rate Limiting & API Throttling

To ensure platform stability, Call20 enforces the following limits:

| Limit Type | Starter | Growth | Scale |
|------------|---------|--------|-------|
| API Requests | 10/min | 60/min | 300/min |
| Webhook Delivery | 5/sec | 20/sec | 100/sec |
| Concurrent Calls | 2 | 10 | 50 |
| Outbound Burst | 5/min | 20/min | 100/min |

- Throttling: 429 Too Many Requests response with `Retry-After` header.
- Bursting: Up to 20% over limit for < 1 minute allowed on Scale tier.

---

## 11. Multi-Tenant Data Architecture

### 11.1 Isolation Strategy

Call20 uses a **shared database, tenant-scoped rows** model (not schema-per-tenant or database-per-tenant):

- Every table that contains tenant data has a `tenant_id UUID NOT NULL` column.
- All queries are parameterized and ALWAYS include `WHERE tenant_id = $1`.
- Row-Level Security (RLS) policies in Postgres enforce this at the database level as a second line of defense.
- Penetration testing to include explicit cross-tenant data access tests before production launch.

### 11.2 Core Table Summary

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `tenants` | id, name, plan, wallet_balance, status, free_credits_applied, coupon_redeemed | Root tenant record |
| `users` | id, tenant_id, email, role, 2fa_enabled | All human users |
| `agent_configs` | id, tenant_id, name, config_json, active | One per AI agent |
| `dids` | id, tenant_id, number, didww_id, agent_config_id | Provisioned numbers |
| `calls` | id, tenant_id, agent_config_id, did_id, from_number, duration, cost, sentiment_score, resolution | One per call |
| `transcripts` | id, call_id, tenant_id, content_json, created_at | One per call |
| `knowledge_bases` | id, tenant_id, name, source_type, status, page_count | KB metadata |
| `kb_chunks` | id, kb_id, tenant_id, content, embedding vector(1536) | pgvector rows |
| `wallet_transactions` | id, tenant_id, call_id, amount, type, balance_after, source (call_topup_coupon_free_trial) | Full audit trail |
| `webhooks` | id, tenant_id, url, events_subscribed, secret, active | Webhook endpoints |
| `sms_messages` | id, tenant_id, call_id, to, content, status | Outbound SMS log |
| `coupons` | id, code, credit_amount_usd, max_redemptions, used_count, expiry_date, tenant_id (nullable), status, created_by, created_at | Promotional coupon definitions |
| `coupon_redemptions` | id, coupon_id, tenant_id, redeemed_at, credit_applied | Tracks which tenants redeemed which coupons |
| `admin_settings` | id, key, value, updated_at, updated_by | Global admin-configurable settings (free credits, etc.) |
| `audit_logs` | id, tenant_id, user_id, action, resource_type, resource_id, details_json, created_at | Full audit trail for admin and tenant actions |
| `webhook_deliveries` | id, webhook_id, tenant_id, event_type, status_code, request_payload, response_body, duration_ms, created_at | Delivery log for webhooks |

---

## 12. Compliance, Security & Privacy

### 12.1 NDPR (Nigeria Data Protection Regulation)

- Call recordings and transcripts stored within Nigerian geographic region (Coolify node hosted in Lagos or designated NG datacenter).
- Data Processing Agreement (DPA) available for enterprise tenants.
- Tenant privacy policy must include disclosure of AI call handling; Call20 provides a template.
- Callers are informed at call start: "This call may be recorded for quality purposes." (Configurable per tenant, mandatory if recording is enabled.)

### 12.2 Data Residency

| Market | Storage Location | Regulation |
|--------|-----------------|------------|
| Nigeria | Lagos VPS node | NDPR |
| Kenya | Nairobi VPS node (Phase 2) | Kenya DPA 2019 |
| South Africa | Johannesburg VPS node (Phase 2) | POPIA |
| EU tenants | Frankfurt VPS (if applicable) | GDPR |

### 12.3 PII Redaction

- Automated scrubbing of PII from AI training logs and analytics exports:
  - Credit card numbers (Luhn-valid sequences)
  - BVN (Bank Verification Number) — 11-digit sequences
  - NIN (National Identification Number)
  - Passwords (detected via context heuristics)
- Redaction is applied before transcript is written to storage.
- Redacted tokens are replaced with `[REDACTED]` in stored transcripts.

### 12.4 Secret Management

- User API keys (ElevenLabs, Google OAuth, CRM) stored in encrypted vault.
- Encryption: AES-256-GCM at rest; keys never transmitted to client-side code.
- Vault access is audited; access events logged with operator identity.
- API keys are rotated on demand; tenants can invalidate from dashboard.

### 12.5 Authentication Security

- Passwords hashed with bcrypt (cost factor 12).
- Login rate-limited: 10 attempts per 15 minutes per IP.
- Suspicious login (new IP/device) triggers email alert.
- All HTTP endpoints enforced over TLS 1.3.

### 12.6 Call Recording Consent

- If `recording_enabled: true`, the agent is configured to play a disclosure at call start.
- Consent response is not required (one-party consent, applicable to NG/KE law — confirm with legal per market).
- For markets requiring two-party consent, a `consent_required: true` flag triggers the agent to explicitly ask for and record verbal consent before proceeding.

### 12.7 Data Backup & Disaster Recovery

#### 12.7.1 Backup Strategy

- **Database:** Daily full backup + WAL archiving for Point-in-Time Recovery (PITR) using WAL-G.
- **File Storage (MinIO):** Continuous replication to a secondary geographic region (e.g., Lagos → Nairobi) using `rclone`.
- **Retention:** Daily backups kept for 30 days; monthly backups kept for 12 months.

#### 12.7.2 RTO / RPO Targets

- **RPO (Recovery Point Objective):** 4 hours (maximum data loss).
- **RTO (Recovery Time Objective):** 1 hour (maximum downtime for restoration).

#### 12.7.3 Disaster Recovery Plan

- In case of primary VPS failure, traffic is routed to the standby cluster via DNS failover (Cloudflare).
- Standby cluster is kept in "warm" state with latest data replicas.

---

## 13. Pricing Architecture

### 13.1 Subscription Tiers (Revisited)

See Section 9.10.4 for the full tier comparison table.

### 13.2 Profitability Model

| Component | Standard Plan (Cartesia) | BYOK Plan (ElevenLabs) |
|-----------|-------------------------|------------------------|
| Wholesale cost/min | ~$0.09 | ~$0.04 (user pays TTS) |
| Platform markup | 2.5× | 4.0× |
| Retail price/min | $0.25–$0.35 | $0.18–$0.22 |
| Gross margin | ~55% | ~75% |

### 13.3 Free Trial & Promotional Credits

#### 13.3.1 Free Trial Credits (Auto-Applied on Signup)
- Starter plan includes free wallet credits on signup.
- **Default Amount:** $10 (configurable by Admin — see Admin Portal settings).
- **Expiry:** Credits expire after 45 days (configurable: 30 / 45 / 60 / 90 days).
- **Toggle:** Admin can enable/disable free trial credits globally (useful for promotional periods or policy changes).
- Credit card not required for signup; required for first top-up or subscription upgrade.

#### 13.3.2 Promotional Coupon System
- Admin can create promotional coupon codes for marketing campaigns, partnerships, or events.
- **Coupon Properties:**

| Property | Description | Example |
|----------|-------------|---------|
| `code` | Unique alphanumeric coupon code | `LAUNCH20` |
| `credit_amount_usd` | Free credit value applied on redemption | `$15.00` |
| `max_redemptions` | Total number of times coupon can be used | `500` |
| `used_count` | Current redemption count (auto-incremented) | `127` |
| `expiry_date` | Coupon expiration (optional) | `2026-12-31` |
| `tenant_id` | Optional: restrict to specific tenant (for partner referrals) | `null` (public) or `uuid` |
| `status` | `active` / `expired` / `disabled` | `active` |
| `created_by` | Admin user who created the coupon | `admin_uuid` |
| `created_at` | Timestamp of creation | `2026-05-01T00:00:00Z` |

- **Redemption Flow:**
  1. Tenant navigates to Dashboard → Wallet → "Redeem Coupon"
  2. Enters coupon code → system validates (exists, not expired, has remaining redemptions, not already used by this tenant)
  3. On success: credit added to wallet, `used_count` incremented, coupon-usage record created
  4. On failure: specific error message shown (e.g., "Code expired", "Already redeemed", "Invalid code")
  5. Coupon credits inherit the same expiry rules as free trial credits (configurable by Admin)

- **Admin Coupon Management (Admin Portal):**

| Action | Description |
|--------|-------------|
| Create Coupon | Set code, amount, max redemptions, expiry, status |
| Edit Coupon | Update amount, max redemptions, expiry, status (not code) |
| Disable Coupon | Immediately prevent new redemptions (existing redemptions unaffected) |
| View Redemptions | See list of tenants who redeemed, with timestamps |
| Bulk Generate | Generate N coupons with sequential codes (e.g., `PROMO001`–`PROMO500`) for events |

- **Coupon Credit Expiry:** Coupon credits expire based on the global free credit expiry setting (default 45 days from redemption). Admin can set a separate expiry for individual coupons.

- **Anti-Abuse:** 
  - One coupon redemption per tenant (regardless of coupon code) — prevents stacking.
  - Rate limit: 5 failed redemption attempts per hour per tenant.
  - Admin can override and manually credit a tenant's wallet (with audit log entry).

#### 13.3.3 Admin Free Credit Settings

In the Admin Portal → Settings → Free Credits:

| Setting | Default | Description |
|---------|---------|-------------|
| `free_trial_enabled` | `true` | Global toggle for auto-credited free trial on signup |
| `free_trial_amount_usd` | `10.00` | Amount credited to new tenants on signup |
| `free_trial_expiry_days` | `45` | Days until free trial credits expire |
| `coupon_credit_expiry_days` | `45` | Days until coupon credits expire (can differ from trial) |
| `allow_coupon_stacking` | `false` | Whether tenants can redeem multiple coupons |

> **Note:** Changes to free credit settings only affect *new* signups and *new* coupon redemptions. Existing free credits are unaffected by setting changes.

### 13.4 Reseller / White-Label Pricing

- Available on Enterprise plan only.
- Resellers purchase minutes at a negotiated wholesale rate (e.g., $0.12/min).
- Resellers set their own retail prices for end clients.
- Call20 provides white-label dashboard with custom domain support.

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Q2 2026)

| Task | Owner | Status |
|------|-------|--------|
| Coolify infrastructure deployment | DevOps | In Progress |
| DIDWW SIP trunk + Pipecat basic loop | Engineering | In Progress |
| Deepgram STT integration (`en-NG` model) | Engineering | Not Started |
| Cartesia TTS integration | Engineering | Not Started |
| Gemini 1.5 Flash integration + basic conversation | Engineering | Not Started |
| Tenant onboarding + auth + RBAC | Engineering | Not Started |
| DID provisioning UI + flow | Engineering | Not Started |
| Basic agent configuration form | Product/Engineering | Not Started |
| Prepaid wallet + Paystack top-up | Engineering | Not Started |
| Call recording + MinIO storage | Engineering | Not Started |
| Post-call transcript (Deepgram batch) | Engineering | Not Started |
| Basic call log dashboard | Engineering | Not Started |
| "Professional Nigerian English" preset voices (Cartesia) | Product | Not Started |

**Phase 1 Exit Criteria:** An external beta tester can sign up, provision a Nigerian number, configure an AI agent with a website knowledge base, and receive a real inbound call handled by the AI within 15 minutes of signup.

### Phase 2: Action Agents (Q3 2026)

| Task | Owner |
|------|-------|
| Google Calendar + Outlook tool integration | Engineering |
| HubSpot + Zoho CRM integration | Engineering |
| DIDWW SMS tool integration | Engineering |
| Human handoff (SIP REFER) | Engineering |
| Sentiment analysis + auto-handoff | Engineering |
| ElevenLabs BYOK integration | Engineering |
| Voice Studio (Cartesia voice cloning UX) | Product/Engineering |
| Outbound calling API | Engineering |
| Webhook event system | Engineering |
| Analytics dashboard (full) | Engineering |
| Firecrawl knowledge base ingestion | Engineering |
| Multi-tenant admin panel | Engineering |

**Phase 2 Exit Criteria:** Existing beta tenants can configure calendar booking, receive CRM-personalized calls, and use BYOK ElevenLabs voices.

### Phase 3: Headless Expansion (Q4 2026)

| Task | Owner |
|------|-------|
| Pan-African DID provisioning (KE, GH, ZA) | Engineering |
| Data residency: Nairobi + Johannesburg nodes | DevOps |
| Number porting | Engineering |
| SSO / SAML integration | Engineering |
| Salesforce + Pipedrive CRM integrations | Engineering |
| White-label dashboard | Engineering |
| HIPAA-adjacent data handling audit | Legal/Engineering |
| Bulk outbound campaign manager | Engineering |
| Multi-language: Pidgin English STT layer | Engineering |

### Phase 3 Exit Criteria: Platform supports 3+ African markets with local data residency and is compliant with HIPAA/SLA requirements for enterprise pilots.

### Phase 4: Omnichannel & Beyond (2027+)

| Task | Owner |
|------|-------|
| WhatsApp Business AI Integration | Engineering |
| Native iOS/Android Tenant App | Engineering |
| Predictive Dialer for Outbound | Engineering |
| Video AI Receptionist | Engineering |

**Phase 4 Exit Criteria:** Call20 is the default voice/messaging OS for Pan-African SMEs with > 5,000 active tenants.

### 14.5 Deployment & CI/CD Pipeline

#### 14.5.1 CI/CD Workflow

- **CI:** GitHub Actions runs on every PR (Linting, Unit Tests, Integration Tests).
- **CD:** Merge to `main` triggers automated deployment to Staging; Manual trigger for Production.
- **Build:** Docker images built and pushed to private registry with version tagging.

#### 14.5.2 Environment Strategy

- **Dev:** Local Docker Compose environment.
- **Staging:** Preview environment for internal QA.
- **Prod:** Geographically distributed nodes (Lagos, Nairobi, Joburg).

#### 14.5.3 Migration & Rollback

- **Migrations:** Managed via Alembic; must be backward-compatible (two-phase deploy for schema changes).
- **Rollback:** One-click rollback in Coolify to the previous Docker image tag; database rollback via automated snapshots.

---

## 15. Acceptance Criteria

### AC-001: Onboarding (Time-to-First-Call)

**Given** a new user signs up and completes the 3-step wizard,
**When** they make a test call to their provisioned Nigerian number,
**Then** the call must be answered by the AI agent within 15 minutes of account creation.

### AC-002: STT Accuracy

**Given** a voice sample of Nigerian English spoken by a native speaker covering standard business queries,
**When** processed by Deepgram Nova-2 `en-NG`,
**Then** the Word Error Rate must be ≤ 12%.

### AC-003: TTS Latency (Standard)

**Given** the Gemini LLM emits the first token of a response,
**When** Cartesia Sonic-2 begins streaming audio,
**Then** the time to first audio byte must be ≤ 120ms at P95 under normal load.

### AC-004: Barge-In Detection

**Given** the AI agent is speaking and the caller begins speaking,
**When** caller speech confidence exceeds 0.7 for > 200ms,
**Then** the AI speech must be terminated within 300ms.

### AC-005: Knowledge Base Ingestion

**Given** a tenant submits a 50-page website URL for ingestion,
**When** the Firecrawl job completes,
**Then** the knowledge base must be available for RAG retrieval within 5 minutes.

### AC-006: Wallet Deduction Accuracy

**Given** a call completes,
**When** the cost is calculated and deducted,
**Then** the deducted amount must be within ±5% of the actual computed cost, and the wallet balance must be updated atomically with no race conditions.

### AC-007: Human Handoff

**Given** the AI agent triggers `handoff_to_human`,
**When** the SIP REFER is executed,
**Then** the caller must hear hold music within 2 seconds and the pre-transfer brief must appear on the human agent's dashboard before the call bridges.

### AC-008: Tenant Data Isolation

**Given** two tenants exist with active knowledge bases and call logs,
**When** any API query is executed for Tenant A,
**Then** no data belonging to Tenant B must be returned under any circumstances (to be verified via automated cross-tenant penetration tests).

### AC-009: Post-Call Transcript

**Given** a call ends,
**When** post-call processing completes,
**Then** a full transcript with speaker diarization must be available in the dashboard within 60 seconds.

### AC-010: BYOK ElevenLabs Fallback

**Given** a tenant has configured BYOK ElevenLabs and the ElevenLabs API returns a 5xx error,
**When** the TTS engine selector runs,
**Then** the system must automatically fall back to Cartesia without interrupting the caller experience beyond a brief pause.

### AC-011: Free Trial Credit Auto-Applied on Signup

**Given** the admin setting `free_trial_enabled` is `true`,
**When** a new tenant completes email verification,
**Then** the tenant's wallet must be credited with the configured `free_trial_amount_usd` (default $10), a `wallet_transactions` record must be created with `source: "free_trial"`, and the tenant's `free_credits_applied` flag must be set to `true`.

### AC-012: Free Trial Credit Toggle

**Given** the admin setting `free_trial_enabled` is `false`,
**When** a new tenant completes email verification,
**Then** no free trial credits are applied to the wallet and the tenant's `free_credits_applied` flag remains `false`.

### AC-013: Coupon Redemption

**Given** a valid, active coupon with remaining redemptions exists,
**When** a tenant enters the coupon code in the Dashboard → Wallet → "Redeem Coupon" form,
**Then** the coupon's `credit_amount_usd` is added to the tenant's wallet, a `coupon_redemptions` record is created, the coupon's `used_count` is incremented, and the tenant's `coupon_redeemed` flag is set to `true`.

### AC-014: Coupon Redemption — Invalid/Expired/Exhausted

**Given** a coupon is expired, disabled, exhausted (used_count >= max_redemptions), or does not exist,
**When** a tenant attempts to redeem it,
**Then** the system returns a specific error message ("Code expired", "Code disabled", "No redemptions remaining", or "Invalid code") and no wallet credit is applied.

### AC-015: Coupon Stacking Prevention

**Given** a tenant has already redeemed one coupon,
**When** the tenant attempts to redeem a second coupon (and `allow_coupon_stacking` is `false`),
**Then** the redemption is rejected with the message "You have already redeemed a coupon. Only one coupon per account is allowed."

### AC-016: Admin Free Credit Settings

**Given** an admin user accesses the Admin Portal → Settings → Free Credits,
**When** the admin changes `free_trial_amount_usd`, `free_trial_expiry_days`, or `free_trial_enabled`,
**Then** the setting is saved to the `admin_settings` table, an `audit_logs` entry is created, and the change only affects new signups (not existing tenants).

### AC-017: Coupon Bulk Generation

**Given** an admin user requests bulk generation of N coupons with a base code,
**When** the admin submits the form,
**Then** N coupon records are created with sequential codes (e.g., `PROMO001` through `PROMO500`), each with the same `credit_amount_usd`, `max_redemptions` (1 per coupon), and `expiry_date`.

### AC-018: Free Credit Expiry

**Given** a tenant has free trial or coupon credits that are past their expiry period (default 45 days),
**When** the tenant's wallet balance is calculated,
**Then** the expired credits are excluded from the available balance and a `wallet_transactions` record is created with `type: "credit_expired"`.

### 15.5 Testing Strategy

#### 15.5.1 Testing Frameworks

- **Unit Testing:** `pytest` for all service layer logic and utilities.
- **API Testing:** FastAPI `TestClient` for endpoint validation.
- **Frontend Testing:** Vitest + React Testing Library for UI components.

#### 15.5.2 Specialized Testing

- **Load Testing:** `Locust` to simulate concurrent calls and measure Pipecat worker saturation.
- **Voice E2E:** Automated SIP calls using `pjsua` to verify end-to-end audio flow and barge-in.
- **Security:** Semi-annual penetration tests + automated IDOR checks in CI/CD.

---

## 16. Open Questions & Decisions Required

| # | Question | Owner | Priority | Deadline |
|---|----------|-------|----------|----------|
| 1 | Which embedding model to use: `text-embedding-3-small` (OpenAI) or `textembedding-gecko` (Google)? Evaluate: cost, latency, quality on Nigerian business text. | Engineering | High | Phase 1 |
| 2 | Secondary SIP trunk provider for failover: Vonage or Telnyx? Evaluate: African DID coverage, pricing, API maturity. | Engineering | High | Phase 1 |
| 3 | What is the legal requirement for call recording consent disclosure per country (NG, KE, GH, ZA)? One-party or two-party? | Legal | High | Phase 1 |
| 4 | What is the NCC regulatory stance on automated outbound AI calls in Nigeria? Does the consent mechanism shift liability to the tenant? | Legal | High | Phase 2 |
| 5 | Pipecat worker scaling strategy: one worker per call (stateful process) or thread-based? What is the concurrency ceiling per VPS node? | Engineering | High | Phase 1 |
| 6 | Should Whisper large-v3 be evaluated as a fallback STT for Pidgin/code-switching detection? | Engineering | Medium | Phase 2 |
| 7 | CRM integration: build native integrations or use a middleware (e.g., n8n, Make)? Native gives more control; middleware is faster to ship. | Product | Medium | Phase 2 |
| 8 | ~~Free trial credit amount ($5): is this sufficient for a meaningful test experience? Consider competitor free tier analysis.~~ | Product | ~~Medium~~ | ~~Phase 1~~ |
| | **RESOLVED (v7.1):** Increased to $10 default, configurable by admin. Added toggle on/off and promotional coupon system. | | | |
| 9 | Tax handling: should Call20 collect and remit VAT for Nigerian tenants (FIRS digital services tax)? | Finance/Legal | Medium | Phase 2 |
| 10 | Voicemail transcription: deliver via Deepgram batch or synchronously? What is the tenant notification channel preference? | Product | Low | Phase 2 |

---

## 17. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Deepgram accent accuracy insufficient | Medium | High | Evaluate Whisper fallback (Open Question #6) |
| Pipecat worker scaling limits | High | High | Load test early; define concurrency ceiling (Open Question #5) |
| DIDWW single point of failure | Medium | High | Failover trunk (Section 9.2.3) |
| Free credit abuse | High | Medium | Anti-abuse measures (IP limiting, device ID) |
| NCC regulatory action on outbound calls | Medium | High | Legal review (Open Question #4) |
| Cartesia API reliability | Low | High | Fallback to ElevenLabs (if configured) or pre-recorded audio |

---

## 18. Glossary

| Term | Definition |
|------|------------|
| **DID** | Direct Inward Dialing — a phone number that routes calls directly to a specific destination |
| **SIP** | Session Initiation Protocol — standard protocol for initiating and managing VoIP calls |
| **Pipecat** | Open-source Python framework for building real-time voice AI pipelines |
| **VAD** | Voice Activity Detection — detects whether audio contains speech or silence |
| **STT** | Speech-to-Text — converts audio to text transcript |
| **TTS** | Text-to-Speech — converts text to synthesized audio |
| **LLM** | Large Language Model — the AI "brain" processing conversation context |
| **RAG** | Retrieval-Augmented Generation — injecting relevant knowledge into the LLM context |
| **pgvector** | Postgres extension enabling vector similarity search |
| **BYOK** | Bring Your Own Key — tenant supplies their own third-party API key |
| **TTFB** | Time To First Byte — latency from synthesis request to first audio data returned |
| **WER** | Word Error Rate — standard metric for STT accuracy |
| **FCR** | First-Call Resolution — call resolved without follow-up or escalation |
| **NDPR** | Nigeria Data Protection Regulation |
| **POPIA** | Protection of Personal Information Act (South Africa) |
| **NCC** | Nigerian Communications Commission |
| **AMD** | Answering Machine Detection — detects if an outbound call is answered by voicemail |
| **Tenant** | A business entity with an active Call20 workspace |
| **Agent Config** | The full configuration object defining an AI agent's persona, voice, tools, and knowledge |
| **Wallet** | The prepaid USD balance a tenant maintains for usage-based billing |
| **HMAC** | Hash-based Message Authentication Code — used to sign and verify webhook payloads |
| **RBAC** | Role-Based Access Control — managing user permissions by role |
| **SLA** | Service Level Agreement — contractual uptime and performance guarantee |
