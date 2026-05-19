# Admin UI

When `type: web` or `type: fullstack`, Zorux generates a full admin interface.

## Dashboard

`/admin` — shows record counts per model, bar chart, recent activity, quick actions.

## CRUD Pages

```
/admin/{model}          # List with search, sort, pagination
/admin/{model}/new      # Create form
/admin/{model}/:id/edit # Edit form
```

Each list page supports:
- **Search** across text fields
- **Sort** by clicking column headers
- **Pagination** with page navigation
- **File preview** for image fields

## Auth Pages

```
/login                  # Login form
/register               # Registration form
/logout                 # Logout
```

## Email Sandbox

When using the `fake` email provider (default in dev), emails are captured and viewable at:

```
/admin/emails           # List of captured emails
/admin/emails/:id       # Email detail with HTML preview
```
