# Admin Panel

Zorux generates a complete admin panel with dashboard, CRUD management, file uploads, rich text editing, email sandbox, feature flags, health monitoring, and more.

The admin panel is built with **DaisyUI 5** + **Tailwind CSS 4**, compiled via `build:css` into a single CSS file (~150KB). It supports light and dark themes with a configurable OKLCH color palette.

## Access

The admin panel is available at `/admin`. All admin pages require authentication — unauthenticated users are redirected to `/login`.

```
http://localhost:3000/admin
http://localhost:3000/login
http://localhost:3000/register
```

## Pages

| Route | Description |
|---|---|
| `/login` | Login form |
| `/register` | Registration form |
| `/logout` | Clears auth cookie, redirects to login |
| `/admin` | Dashboard with stats and recent activity |
| `/admin/{model}` | List view with search, sort, pagination |
| `/admin/{model}/new` | Create new record |
| `/admin/{model}/:id/edit` | Edit existing record |
| `/admin/features` | Feature flag management |
| `/admin/monitor` | Health and metrics dashboard |
| `/admin/emails` | Email sandbox viewer |

## Dashboard

The dashboard (`/admin`) displays:

- **Stat cards** — Record counts for each model
- **SVG bar chart** — Visual representation of model data
- **Recent activity** — Latest records across all models
- **Quick actions** — Links to create new records

## Model List View

Each model gets an auto-generated list page at `/admin/{model}`.

### Features

- **Search** — Full-text search across string/text fields
- **Sort** — Click column headers to sort ascending/descending
- **Pagination** — Navigate pages with prev/next controls
- **Field display** — Shows all model fields in a table
- **Boolean badges** — Green (true) / Red (false) badges
- **Image thumbnails** — Preview for file fields
- **Action buttons** — Edit, Delete per row

### Example

```
GET /admin/posts
```

Displays a table with columns: `id`, `title`, `status`, `authorId`, `createdAt`, `updatedAt`.

## Create Form

`/admin/{model}/new` generates a dynamic form based on model fields.

### Field Types

| Field Type | Input Widget |
|---|---|
| `string` | Text input |
| `text` | Textarea (or Trix rich text editor) |
| `int` | Number input |
| `float` | Number input (decimal) |
| `bool` | Checkbox |
| `email` | Email input |
| `file` | File upload with drag & drop |
| `enum` | Select dropdown |
| `relation` | Select dropdown (foreign key) |

### Rich Text Editor

Text fields can use the Trix rich text editor for formatted content.

### File Upload

File fields support:
- Drag & drop
- File type validation
- Filename sanitization
- Preview for image files

## Edit Form

`/admin/{model}/:id/edit` loads the record and pre-fills the form.

### Delete

Each edit page has a delete button that performs a soft delete (if enabled) or permanent delete.

## Email Sandbox

When using the `fake` email provider, all sent emails are captured in memory and viewable at `/admin/emails`.

### Features

- **List view** — Shows all captured emails with subject, to, date
- **Detail view** — Full email content
- **HTML preview** — Renders HTML emails
- **Clear all** — Delete all captured emails
- **Delete individual** — Remove specific emails

## Feature Flags

Manage feature flags at `/admin/features`.

### Operations

- **Create flag** — Key, value, description
- **Toggle flag** — Enable/disable with one click
- **Delete flag** — Remove flag

### API Integration

Flags are synced with the `/api/features` endpoint. Changes in the admin UI are immediately reflected in the API.

## Health Monitor

The monitor page (`/admin/monitor`) displays:

- **Database status** — Connected / Disconnected
- **Uptime** — Server runtime
- **Memory usage** — Heap statistics
- **Request metrics** — Counters and histograms
- **Cache status** — HIT/MISS ratios (if caching enabled)
- **Job queue** — Pending/running/completed/failed counts

## Navigation

The admin sidebar is auto-generated from your models. Each model appears as a navigation item with its record count.

## Authentication

Admin pages are protected by the `authMiddleware`. It checks for:

1. `token` cookie (JWT)
2. `Authorization: Bearer <token>` header

If not authenticated, redirects to `/login`.

## Theme

The admin UI uses the framework's theme configuration:

```yaml
theme:
  framework: daisyui     # UI framework
  primary: "#a855f7"     # Primary color
  mode: dark             # light | dark | auto
```

## SPA Navigation

The admin uses Turbo-style SPA navigation (`/static/turbo.js`):

- Clicking links intercepts navigation
- Fetches new page via AJAX
- Replaces body content
- Updates URL without full page reload
- WebSocket triggers auto-refresh on data changes

## PWA Support

Admin pages auto-register:
- `manifest.json` — PWA manifest
- `sw.js` — Service worker for offline caching

## Mobile Responsive

The admin UI is responsive and works on mobile devices with collapsible sidebar.

## Custom Admin Pages

You can add custom admin pages via plugins:

```typescript
// plugins/my-admin.ts
export default {
  name: "my-admin",
  onRoutes(app) {
    app.get("/admin/custom", (c) => {
      return c.html(`<h1>Custom Admin Page</h1>`)
    })
  }
}
```

## DaisyUI Components

The admin panel uses these DaisyUI 5 components:

| Component | Usage |
|---|---|
| **Drawer** | Sidebar layout (`lg:drawer-open`) |
| **Navbar** | Top bar with title, theme toggle, notifications |
| **Menu** | Sidebar navigation with active state |
| **Stat** | Dashboard stat cards |
| **Card** | Content sections (list, form, dashboard) |
| **Table** | Data tables |
| **Modal** | Delete confirmation dialogs |
| **Join** | Pagination and button groups |
| **Toggle** | Feature flag on/off |
| **Status** | Health indicators |
| **Fieldset** | Form field grouping |
| **Alert** | Error messages |
| **Badge** | Status labels |
| **Tooltip** | Icon hints |
| **Dropdown** | Notification dropdown |
| **Input / Select / File Input** | Form fields |

The theme is configured via OKLCH color values compiled from `admin.css`. Light and dark themes are supported and toggled via the navbar button.
