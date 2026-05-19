# Zorux — Prompt Templates for AI Assistants
# Copy and paste these prompts into any AI coding assistant (Claude, ChatGPT, Copilot, etc.)
# to generate Zorux projects and features.

## Template 1: Create a complete SaaS from scratch

"""
Create a Zorux app.yaml for a SaaS called "{project_name}" with:

TYPE: fullstack
AUTH: User model with email/password + OAuth (Google, GitHub)
ROLES: admin, editor, viewer

MODELS:
1. User — name, email (unique), avatar, role (enum: admin/editor/viewer)
   - Auth: email
2. Team — name, slug (unique), owner (belongs to User)
3. TeamMember — team, user, role (enum: owner/admin/member)
4. Project — name, description, team (belongs to Team), createdBy (belongs to User)
   - Soft delete: true
   - Policies: 
     - Create: authenticated
     - Read: members of the project's team
     - Update: team owner or admin
     - Delete: team owner only
5. Task — title, description, status (enum: todo/in_progress/done), priority (enum: low/medium/high/critical), assignedTo (belongs to User), project (belongs to Project), dueDate (string)
   - Soft delete: true
   - Policies:
     - Create: authenticated (auto-assign to project's team)
     - Read: members of the task's project team
     - Update: assigned user or team admin
     - Delete: project owner or team admin

DATABASE: PostgreSQL (or SQLite for dev)
EMAIL: Resend (production), Fake (dev)

Also add a simple action/analytics.ts with an endpoint to count tasks by status.
"""

## Template 2: Add a new model with relations

"""
Add a "comment" model to the existing Zorux app.yaml:

Comment:
  - content: text (required)
  - post: belongs to Post
  - author: belongs to User 
  - Timestamps: true
  - Policies:
    - Create: authenticated
    - Read: "*" (public)
    - Update: author or admin
    - Delete: admin

Also add a comments count endpoint action.
"""

## Template 3: Set up OAuth

"""
Configure OAuth for Google and GitHub in Zorux app.yaml:

auth:
  social:
    google:
      clientId: env.GOOGLE_CLIENT_ID
      clientSecret: env.GOOGLE_CLIENT_SECRET
    github:
      clientId: env.GITHUB_CLIENT_ID
      clientSecret: env.GITHUB_CLIENT_SECRET
"""

## Template 4: Add ABAC policies

"""
Add field-level ABAC policies to the User model:
- Only admins can see/change the "role" field
- Users can see their own "email" but not others'
- The "password" field is never readable by anyone

Use Zorux's fieldPolicies syntax.
"""

## Template 5: Create a blog

"""
Create a blog app.yaml with:

Models:
1. User (auth: email)
2. Post — title, content (text), author (User), published (boolean), tags (string)
   - Soft delete, timestamps
   - Policies: create=authenticated, read=*, update=author||admin, delete=admin
3. Comment — content, post (Post), author (User)
   - Timestamps
   - Policies: create=authenticated, read=*, delete=admin

Add OAuth (Google + GitHub), SQLite database, fake email for dev.
"""

## Template 6: Create custom action

"""
Create a Zorux action file 'actions/posts.ts' with:
1. publish — validates the post, sets published=true, returns the post
2. unpublish — sets published=false
3. stats — returns { total, published, draft, comments }

Each action should check if user is authenticated and has proper permissions.
"""

## Template 7: CLI workflow for existing project

"""
I have an existing Zorux project. Walk me through:
1. Adding a "category" model with name and slug
2. Adding a belongsTo relation from Post to Category
3. Creating a migration for the changes
4. Seeding some test data
5. Generating a mobile app
"""
