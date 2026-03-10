# One Group Postiz — Setup & Usage Guide

## Overview

A customized fork of [Postiz](https://postiz.com) for One Group's real estate social media management. All AI features run on **Google Gemini** (single API key). Includes 4 custom plugins for brand-aware content creation.

| Plugin | Purpose |
|--------|---------|
| **Brand Context** | Persistent knowledge base per project (brand info, USPs, RERA, amenities) |
| **Media Folders** | Organize media by project and purpose (renders, site photos, brand assets) |
| **Branded Image Generation** | AI-powered image creation using project templates + Gemini native imaging |
| **Monthly Post Planner** | Auto-generate a month's content calendar with Indian market awareness |

---

## Quick Start (Development)

### Prerequisites

- **Node.js** >= 22.12.0 (< 23.0.0)
- **pnpm** 10.6.1+ (`npm install -g pnpm@10.6.1`)
- **Docker Desktop** (for PostgreSQL, Redis, Temporal)
- **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Step 1: Clone & Install

```bash
git clone <your-fork-url> postiz-app
cd postiz-app
pnpm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set these **required** values:

```env
# === Database & Redis (match docker-compose.dev.yaml defaults)
DATABASE_URL="postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-long-random-secret-string-here"

# === URLs
FRONTEND_URL="http://localhost:4200"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
BACKEND_INTERNAL_URL="http://localhost:3000"

# === AI (Google Gemini — powers ALL AI features)
GEMINI_API_KEY="your_gemini_api_key_here"

# === Storage (use "local" for development)
STORAGE_PROVIDER="local"
UPLOAD_DIRECTORY="uploads"
NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY="uploads"

# === Required flag
IS_GENERAL="true"
NX_ADD_PLUGINS=false
```

### Step 3: Start Infrastructure (Docker)

```bash
pnpm run dev:docker
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Temporal** on port 7233 (background job orchestrator)
- **pgAdmin** on port 8081 (optional DB viewer)
- **Temporal UI** on port 8080 (optional workflow viewer)

Wait ~30 seconds for all containers to be healthy.

### Step 4: Push Database Schema

```bash
pnpm run prisma-db-push
```

This creates all tables including the 4 plugin tables: `BrandContext`, `MediaFolder`, `ImageTemplate`, `PlannerConfig`.

### Step 5: Start the Application

```bash
pnpm run dev
```

This starts 3 services in parallel:
- **Backend API** → http://localhost:3000
- **Frontend** → http://localhost:4200
- **Orchestrator** (Temporal worker for background jobs)

Open **http://localhost:4200** in your browser. Create your account and log in.

---

## AI Architecture (Gemini-Only)

Every AI feature in this fork runs on a single `GEMINI_API_KEY`:

| Feature | Gemini Model | Purpose |
|---------|-------------|---------|
| Copilot Chat | `gemini-2.5-pro` | Interactive AI assistant in the UI |
| Post Generation Agent | `gemini-2.5-flash` | LangGraph agent for creating posts |
| Post Insert Agent | `gemini-2.5-flash` | Categorizes and stores popular posts |
| Auto-Post | `gemini-2.5-flash` + `gemini-2.0-flash-exp` | RSS-to-post with AI images |
| Image Slides | `gemini-2.5-flash` + `gemini-2.0-flash-exp` | Text-to-video slide generation |
| Post Splitting | `gemini-2.5-flash` | Split long posts into threads |
| Media Description | `gemini-2.5-flash` | AI descriptions for uploaded media |
| Branded Image Gen | `gemini-2.5-flash` + `gemini-2.0-flash-exp` | Brand-aware image generation |
| Monthly Planner | `gemini-2.5-pro` | Monthly content calendar generation |

---

## Plugin 1: Brand Context

### What It Does
Stores structured knowledge about your company and projects. When you generate images or plan posts, the AI reads this context to produce accurate, on-brand content.

### How to Use

**Step 1:** Go to **Settings** in the Postiz sidebar. Open the Brand Context section.

**Step 2:** Click **"Add Brand Context"** and create blocks:

**Company Block:**
- **Name**: "One Group Overview"
- **Type**: Company
- **Content**:
  ```
  One Group is a real estate developer based in North India operating across
  Delhi NCR, Mohali, Ghaziabad, and Rohtak. Sub-brands include Saavira (premium
  luxury), One City (integrated townships), and an IBC acquisition division.
  Brand voice: Professional yet approachable, emphasizing quality construction
  and community living.
  ```
- **Priority**: 10 (higher = read first by AI)
- **Is Active**: Yes

**Project Block:**
- **Name**: "Clermont Mohali"
- **Type**: Project
- **Project Tag**: `clermont-mohali` (this tag links everything together)
- **Location**: "Mohali, Punjab"
- **Content**:
  ```
  Clermont by Saavira — Premium 3/4 BHK apartments in Sector 91, Mohali.
  Price: Starting 1.2 Cr | Sizes: 1800-3200 sq ft
  USPs: Italian marble flooring, MIVAN construction, rooftop infinity pool,
  German kitchen fittings, 24/7 security with facial recognition.
  RERA: PBRERA-SAS81-PR0960
  Amenities: Clubhouse, swimming pool, jogging track, children play area,
  meditation garden, EV charging stations.
  Possession: December 2027 | Status: 15th floor construction ongoing.
  ```
- **Priority**: 5

**Voice Block:**
- **Name**: "Brand Voice Guidelines"
- **Type**: Voice
- **Content**: "Tone: Premium but not pretentious. Avoid aggressive sales language. Focus on lifestyle, community, and build quality. Use Hindi keywords naturally in English copy (e.g., 'vastu-compliant', 'pooja room'). Never compare with competitors directly."

**Compliance Block:**
- **Name**: "Compliance & Legal"
- **Type**: Compliance
- **Content**: "All advertisements must include RERA registration number. Disclaimer: 'Artist impression. Actual may vary.' required on renders. No guaranteed returns language for residential projects."

**Step 3:** Repeat for each project (Clermont, One City Mohali, One City Rohtak, etc.) — each with its own `projectTag` and `location`.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/brand-context` | List all blocks |
| POST | `/brand-context` | Create new block |
| PUT | `/brand-context/:id` | Update block |
| DELETE | `/brand-context/:id` | Soft delete block |
| GET | `/brand-context/project-tags` | Get distinct project tags |
| GET | `/brand-context/project/:tag` | Get blocks for a project |

---

## Plugin 2: Media Folders

### What It Does
Organizes your media library into folders by project. Creates a **Brand Assets** folder that the image generation plugin reads from.

### How to Use

**Step 1:** In the Media Library, click the gear icon. Create folders:

| Folder Name | Type | Purpose |
|-------------|------|---------|
| Clermont Renders | Project | 3D renders for Clermont Mohali |
| Clermont Site Photos | Project | Construction progress photos |
| One City Rohtak | Project | All media for One City Rohtak |
| Brand Assets | Brand Assets | Logos, badges, RERA watermarks |

**Step 2:** Upload brand assets (logo PNG, RERA badge, etc.) to the **Brand Assets** folder.

**Step 3:** Use folder pills at the top of the media library to filter by folder.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/media-folders` | List all folders |
| POST | `/media-folders` | Create folder |
| PUT | `/media-folders/:id` | Update folder |
| DELETE | `/media-folders/:id` | Delete folder |
| POST | `/media-folders/move-media` | Move media to folder |
| GET | `/media-folders/brand-assets` | Get brand assets folder |
| GET | `/media?folderId=xxx` | Filter media by folder |

---

## Plugin 3: Branded Image Generation

### What It Does
Generates professional, on-brand social media images using a two-step AI pipeline:
1. **Gemini 2.5 Flash** crafts a focused image prompt from your brand context + template
2. **Gemini 2.0 Flash** generates the image natively, incorporating your logo and brand assets

### How to Use

**Step 1: Create Image Templates**

Go to Image Templates and create templates for different post types:

- **Name**: "Construction Update"
- **Project Tag**: `clermont-mohali`
- **Prompt Skeleton**:
  ```
  Create a {style} social media image for {project_name}.
  The image should show {user_description}.
  Place the logo from reference image 1 in the {logo_position} corner.
  Use the color palette: {color_palette}.
  The overall mood should be {mood}.
  ```
- **Visual Rules** (JSON):
  ```json
  {
    "logoPosition": "bottom-right",
    "colorPalette": ["#1A3A5C", "#D4A843", "#FFFFFF"],
    "style": "modern-architectural",
    "mood": "premium, aspirational"
  }
  ```
- **Linked Asset IDs**: Media IDs of your logo/badge from the Brand Assets folder

**Step 2: Generate Images**

When creating a post, click **"AI Image"**:
1. Select **"Branded Image (Nano Banana 2)"** from the generator list
2. Choose your template
3. Enter a brief description: *"construction progress showing 12th floor formwork"*
4. Choose orientation (vertical for Stories/Reels, horizontal for Feed)
5. Generate

### How the Pipeline Works

```
User Input: "construction progress showing 12th floor formwork"
        |
Step 1: Gemini 2.5 Flash reads:
  - Template skeleton + visual rules
  - Brand context (project details, RERA, colors)
  - User description
  --> Crafts focused image prompt
        |
Step 2: Gemini 2.0 Flash receives:
  - Crafted prompt
  - Brand assets as base64 reference images
  - responseModalities: ["IMAGE", "TEXT"]
  --> Returns generated image
  --> Uploaded to your storage
```

---

## Plugin 4: Monthly Post Auto-Planner

### What It Does
Generates an intelligent monthly content calendar. It:
- Reads your actual project details from Brand Context
- Knows Indian festivals, financial calendar events, and regional occasions
- Considers seasonal real estate angles
- Spaces posts intelligently with category variety

### How to Use

**Step 1: Configure Planner (Optional)**

Set default preferences per project:
- **Project Tag**: `clermont-mohali`
- **Posts Per Week**: 3
- **Preferred Categories**: Promotional, Educational, Behind The Scenes, Testimonial, Lifestyle, Update
- **Content Guidelines**: "Focus on premium lifestyle positioning. Mention RERA in promotional posts."

**Step 2: Generate Monthly Plan**

1. Click **"Plan Month"** in the calendar view
2. Select project from the dropdown
3. Pick the target month (defaults to next month)
4. Adjust posts per week if needed
5. Click **"Generate Plan"**

**Step 3: Review Generated Posts**

The AI generates 12-16 draft posts per month with:
- **Title** and **Content** (HTML-formatted, referencing actual project details)
- **Suggested Date** (intelligently placed across the month)
- **Category** (varied mix)
- **Contextual Hook** (why this post on this date — e.g., "Holi weekend", "FY closing urgency")

Posts appear as drafts in your calendar. Review, add images (Plugin 3), and approve.

### Indian Market Awareness

The planner considers:

| Category | Examples |
|----------|----------|
| **National Festivals** | Republic Day, Holi, Independence Day, Diwali, Navratri, Eid, Christmas |
| **Regional Events** | Baisakhi & Lohri (Punjab), Haryana Day, Delhi-specific events |
| **Financial Calendar** | GST deadlines, FY closing (March), tax saving season (Jan-March) |
| **Seasonal Themes** | Monsoon-ready construction, winter possession, summer amenities |
| **Real Estate Cycles** | Festive buying (Oct-Nov), year-end offers, new launch season (Jan-March) |

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/monthly-planner/generate` | Generate monthly plan |
| POST | `/monthly-planner/config` | Create planner config |
| GET | `/monthly-planner/config` | List all configs |
| GET | `/monthly-planner/config/:projectTag` | Get config for project |
| PUT | `/monthly-planner/config/:id` | Update config |
| DELETE | `/monthly-planner/config/:id` | Delete config |

### Generate Request Body
```json
{
  "projectTag": "clermont-mohali",
  "month": "2026-04",
  "postsPerWeek": 4,
  "integrationIds": ["integration-uuid-1", "integration-uuid-2"]
}
```

---

## Complete Setup Checklist

1. [ ] Install Node.js >= 22.12.0 and pnpm 10.6.1+
2. [ ] Clone repo and run `pnpm install`
3. [ ] Copy `.env.example` to `.env` and configure
4. [ ] Set `GEMINI_API_KEY` in `.env`
5. [ ] Start Docker services: `pnpm run dev:docker`
6. [ ] Push database schema: `pnpm run prisma-db-push`
7. [ ] Start app: `pnpm run dev`
8. [ ] Create your user account at http://localhost:4200
9. [ ] Connect social media integrations (Settings > Channels)
10. [ ] Create Brand Context blocks (company + projects)
11. [ ] Create Media Folders (at least "Brand Assets")
12. [ ] Upload logos/badges to Brand Assets folder
13. [ ] Create Image Templates (one per project)
14. [ ] Link brand asset IDs to templates
15. [ ] Configure Monthly Planner defaults (optional)
16. [ ] Generate a test image and test monthly plan

---

## Recommended First-Time Walkthrough

1. **Brand Context first** — Add your company block + one project block (e.g., Clermont Mohali)
2. **Upload brand assets** — Logo PNG to the Brand Assets folder
3. **Create one template** — "Construction Update" with visual rules and logo linked
4. **Generate a test image** — Use the Branded Image generator with a simple prompt
5. **Generate a test month** — Run the planner for next month on your test project
6. **Review results** — Check the calendar for the generated draft posts

---

## Production Deployment

### Build for Production

```bash
pnpm run build
```

This builds all 3 apps (frontend, backend, orchestrator) into their `dist/` folders.

### Start Production Services

```bash
# Start each service separately
pnpm run start:prod:backend      # Backend API on port 3000
pnpm run start:prod:frontend     # Frontend on port 4200
pnpm run start:prod:orchestrator # Temporal worker

# Or use PM2 (auto-restarts)
pnpm run pm2
```

### Production Environment

Set these additional `.env` values for production:

```env
# Use your actual domain
FRONTEND_URL="https://social.onegroup.in"
NEXT_PUBLIC_BACKEND_URL="https://api.social.onegroup.in"
BACKEND_INTERNAL_URL="http://localhost:3000"

# Use Cloudflare R2 for file storage
STORAGE_PROVIDER="cloudflare"
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_ACCESS_KEY="your-access-key"
CLOUDFLARE_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_BUCKETNAME="your-bucket-name"
CLOUDFLARE_BUCKET_URL="https://your-bucket-url.r2.cloudflarestorage.com/"
CLOUDFLARE_REGION="auto"

# Production database
DATABASE_URL="postgresql://user:pass@your-db-host:5432/postiz"
REDIS_URL="redis://your-redis-host:6379"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `pnpm install` fails | Ensure Node.js >= 22.12.0 and pnpm >= 10.6.1 |
| Docker containers not starting | Run `docker compose -f docker-compose.dev.yaml down` then try again |
| `prisma-db-push` fails | Ensure PostgreSQL is running: `docker ps` |
| Backend won't start | Check `DATABASE_URL` and `REDIS_URL` match docker-compose |
| Frontend shows blank page | Ensure backend is running and `NEXT_PUBLIC_BACKEND_URL` is correct |
| AI features not working | Check `GEMINI_API_KEY` is set and valid at [AI Studio](https://aistudio.google.com/apikey) |
| "Branded Image" not in generators | Restart backend after setting `GEMINI_API_KEY` |
| Image generation fails | Check backend logs. Ensure Gemini API quota is not exhausted |
| Monthly planner returns empty | Ensure Brand Context blocks exist for the selected project tag |
| Monthly planner posts not on calendar | Include `integrationIds` in the request body |
| Template assets not in images | Verify linked asset IDs exist and URLs are accessible |
| Temporal workflows failing | Check Temporal is running on port 7233: `docker ps` |

---

## Architecture Notes

- **Monorepo**: pnpm workspace with `apps/backend`, `apps/frontend`, `apps/orchestrator`, `libraries/`
- **Backend**: NestJS with Controller > Service > Repository pattern
- **Frontend**: Vite + React, Tailwind CSS 3, SWR for data fetching
- **Background Jobs**: Temporal workflows (scheduling, auto-posting)
- **AI**: Google Gemini exclusively (`@google/genai`, `@langchain/google-genai`, `@ai-sdk/google`)
- **Auth**: JWT-based, `AuthMiddleware` > `@GetOrgFromRequest()` decorator
- **Plugins**: Self-contained NestJS modules, `@Video` decorator for image generators
- **Storage**: Local (dev) or Cloudflare R2 (prod) via `UploadFactory`
