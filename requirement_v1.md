# Personal File Manager — Full Requirements & Implementation Spec

> A web-based personal file manager built for Gebeyaw's father to organize notes, photos, audios, and videos in a structured folder system backed by Google Drive.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [User Roles & Authentication](#3-user-roles--authentication)
4. [Core Data Model](#4-core-data-model)
5. [Feature Requirements](#5-feature-requirements)
6. [UI/UX Requirements](#6-uiux-requirements)
7. [Google Drive Integration](#7-google-drive-integration)
8. [API Design](#8-api-design)
9. [Database Schema](#9-database-schema)
10. [Project File Structure](#10-project-file-structure)
11. [Google Cloud Setup Guide](#11-google-cloud-setup-guide)
12. [Environment Variables](#12-environment-variables)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Project Overview

A mobile-first, responsive web application that lets a user organize personal content (notes, photos, audios, videos) into a nested folder hierarchy. Content lives inside **Objects** — cards that act as self-contained units, each holding a title, an optional rich-text note, and/or one or more media files. Media files are stored in Google Drive; metadata and notes are stored in MySQL.

### Key Design Principles
- **Object-centric**: the atomic unit is an Object, not a file. An Object groups related content (note + media) under one titled card.
- **Folder-first navigation**: the entry point is always a folder view; content is never loose.
- **Account-isolated**: every user account sees only their own data, with their own Drive folder.
- **Soft-delete**: nothing is permanently deleted without explicit action from the trash.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), plain CSS (no framework) |
| Backend | Node.js, Express.js |
| Database | MySQL |
| ORM / Query Builder | mysql2 (raw queries or light wrapper) |
| Auth | JWT (access token) + HTTP-only cookie refresh token |
| File Storage | Google Drive API v3 |
| Google Auth | Google Cloud OAuth 2.0 (service account per user folder) |
| Media Preview | Browser-native (img, video, audio tags) + thumbnail generation |
| Deployment (future) | To be decided |

---

## 3. User Roles & Authentication

### 3.1 Roles

| Role | Description |
|---|---|
| `admin` | The developer (you). Can create, read, update, and delete any user account. Can see all accounts in an admin panel. Cannot see the content of other users (content is isolated). |
| `user` | Gebeyaw's father. Each account has its own isolated space. Cannot register or manage accounts. |

> [!IMPORTANT]
> Only the **admin** can create new user accounts. There is no self-registration.

### 3.2 Account Structure

- Your father may have **multiple `user` accounts** for different purposes (e.g., personal, work, family).
- Each account is completely **data-isolated**: separate folders, objects, and Drive folder.
- One `admin` account exists (you).

### 3.3 Authentication Flow

1. User lands on `/login`.
2. Submits email + password.
3. Backend validates credentials, issues:
   - **Access token** (JWT, 15 min TTL) — stored in memory on the client.
   - **Refresh token** (JWT, 7 days TTL) — stored in an HTTP-only `SameSite=Strict` cookie.
4. When the access token expires, the client silently calls `POST /auth/refresh`.
5. Logout clears both tokens and invalidates the refresh token in the DB.

### 3.4 Password Rules
- Minimum 8 characters.
- Hashed with **bcrypt** (salt rounds: 11).
- Admin can reset any user's password from the admin panel.

---

## 4. Core Data Model

### Conceptual Hierarchy

```
Account
└── Folder (unlimited nesting)
    └── Sub-folder
        └── ...
            └── Object
                ├── Title (required)
                ├── Note (optional — stored in MySQL, rich text as HTML or Markdown)
                └── Media Files (optional — 1 or more, stored on Google Drive)
                    ├── Photo
                    ├── Audio
                    └── Video
```

### Object Rules
- An object **must** have a title.
- An object **may** have a note, media files, or both — but not neither (at least one must be present on save).
- An object can hold **multiple media files** of any combination of types.
- Media files retain their original file name and have a type (`photo`, `audio`, `video`).

### Folder Rules
- Folders can be nested to **unlimited depth**.
- A folder has a name and belongs to either another folder (parent) or to the account root.
- Folders can be moved, renamed, soft-deleted, and restored.

---

## 5. Feature Requirements

### 5.1 Authentication

| ID | Requirement |
|---|---|
| AUTH-1 | Login page with email and password fields |
| AUTH-2 | JWT-based session with silent refresh |
| AUTH-3 | Logout clears session on client and server |
| AUTH-4 | Protected routes redirect to login if unauthenticated |
| AUTH-5 | "Remember me" checkbox extends refresh token to 30 days |

### 5.2 Folder Management

| ID | Requirement |
|---|---|
| FOL-1 | Root view shows all top-level folders for the logged-in account |
| FOL-2 | Create a new folder (with a name) anywhere in the hierarchy |
| FOL-3 | Rename a folder |
| FOL-4 | Move a folder to a different parent folder |
| FOL-5 | Soft-delete a folder (all child folders and objects inside move to trash together) |
| FOL-6 | Navigate into a folder to see its sub-folders and objects |
| FOL-7 | Breadcrumb navigation showing the current path (e.g. Home > Family > 2024) |
| FOL-8 | Folder displays: name, date created, number of direct objects inside |

### 5.3 Object Management

| ID | Requirement |
|---|---|
| OBJ-1 | Create an object inside a folder with a title |
| OBJ-2 | Add an optional note (rich text) to the object |
| OBJ-3 | Upload one or more media files (photo, audio, video) to the object |
| OBJ-4 | View the object in a detail page/modal showing all its content |
| OBJ-5 | Edit the object title, note, or media files (add/remove individual files) |
| OBJ-6 | Soft-delete an object (moves to trash, restorable within 30 days) |
| OBJ-7 | Move an object to a different folder |
| OBJ-8 | Object card shows: title, date created, media preview (or default icon if note-only) |

### 5.4 Media Handling

| ID | Requirement |
|---|---|
| MED-1 | Accepted photo types: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| MED-2 | Accepted audio types: `.mp3`, `.wav`, `.ogg`, `.m4a` |
| MED-3 | Accepted video types: `.mp4`, `.mov`, `.webm` |
| MED-4 | Maximum file size per upload: **50 MB** (configurable via env var) |
| MED-5 | Files are uploaded to the user's dedicated Google Drive folder |
| MED-6 | Photos show a thumbnail preview on the object card |
| MED-7 | Videos show the **first frame as a thumbnail** with a play-icon overlay on the card |
| MED-8 | Audio shows a waveform icon on the card, plays inline on the detail page |
| MED-9 | Files can be individually deleted from an object (also deletes from Drive) |
| MED-10 | Files can be downloaded individually |

### 5.5 Sharing

| ID | Requirement |
|---|---|
| SHR-1 | A folder **or an individual object** can be made **publicly shareable** via a unique link (UUID-based) |
| SHR-2 | A share link gives **read-only, no-download** access by default — no login required to view |
| SHR-3 | The share link can be **revoked** at any time |
| SHR-4 | The share creator can optionally **enable downloading** when generating or editing a share link |
| SHR-5 | Shared folder view shows the folder name and its object cards (read-only); shared object view shows the object title, note, and media |
| SHR-6 | Download permission is **off by default** — the recipient sees media inline but no download button unless the owner explicitly enabled it |

### 5.6 Trash / Soft Delete

| ID | Requirement |
|---|---|
| TRA-1 | Deleted folders and objects move to a **Trash** section |
| TRA-2 | Items in trash are auto-permanently-deleted after **30 days** |
| TRA-3 | User can restore any item from the trash |
| TRA-4 | User can permanently delete a single item from the trash manually |
| TRA-5 | User can "Empty Trash" to permanently delete all trashed items at once |
| TRA-6 | Trash shows: item name, type (folder/object), deleted date, days remaining |

### 5.7 Admin Panel

| ID | Requirement |
|---|---|
| ADM-1 | Admin-only section at `/admin` |
| ADM-2 | List all user accounts (name, email, date created, last login) |
| ADM-3 | Create a new user account (name, email, password) |
| ADM-4 | Edit a user's name or email |
| ADM-5 | Reset a user's password |
| ADM-6 | Deactivate / reactivate a user account (disabled accounts cannot log in) |
| ADM-7 | Delete a user account (soft-delete; prompts for confirmation) |

### 5.8 Search

| ID | Requirement |
|---|---|
| SCH-1 | Global search bar (always visible in nav) searches within the logged-in user's scope |
| SCH-2 | Search matches object titles, note text snippets, folder names, and media file names |
| SCH-3 | Results show the item type (folder / object), its path, and a snippet |
| SCH-4 | Clicking a result navigates to the containing folder |

---

## 6. UI/UX Requirements

### 6.1 Layout

- **Mobile-first**: designed for small screens, enhanced for desktop.
- **Sidebar navigation** (collapsible on mobile) with:
  - Home (root folders)
  - Trash
  - Admin (visible only for `admin` role)
  - Account switcher (if admin is logged in, they can impersonate to view — optional for v1)
- **Top bar**: app name/logo, search bar, user avatar / logout button.
- **Breadcrumb**: below the top bar when inside a folder.

### 6.2 Folder View

- Folder cards displayed in a **grid** (2 columns mobile, 3+ columns desktop).
- Objects displayed below folders as **card list** (cards with preview).
- Sort options: Date created (default), Name A–Z, Name Z–A.
- "New Folder" and "New Object" floating action buttons (FAB) on mobile, inline buttons on desktop.

### 6.3 Object Card

```
┌────────────────────────────┐
│  [Media Thumbnail / Icon]  │
│                            │
│  Object Title              │
│  📅 Nov 24, 2026           │
│  📎 3 files  📝 Note       │
└────────────────────────────┘
```

- If object has photos: show first photo as thumbnail.
- If object has video only: show first frame extracted as thumbnail with a play-icon overlay on top.
- If object has audio only: show a music note icon.
- If object has only a note: show a document/text icon.
- Three-dot menu on card for quick actions: Edit, Move, Delete, Share (folder-level).

### 6.4 Object Detail View

- Opens as a **full-page route** (not modal), URL: `/folder/:folderId/object/:objectId`
- Sections:
  - **Header**: title (editable inline), date, back button.
  - **Note section**: rendered rich text (view mode) or editor (edit mode).
  - **Media section**: gallery grid of all media files. Photo = opens fullscreen lightbox with pinch-to-zoom / scroll-to-zoom. Video = opens fullscreen player with zoom controls. Audio = HTML `<audio>` inline player.
  - **Actions bar**: Edit, Add media, Download, Delete.

### 6.5 Color Palette & Theme

- Clean, minimal aesthetic: white/off-white backgrounds, dark text, one accent color.
- **No default AI-cliché palettes** (no dark navy + gradient, no purple-to-blue gradients). Aim for warmth and simplicity — think warm sand tones, forest greens, terracotta, or muted earth tones. The exact palette will be chosen during implementation but must feel personal and calm, not corporate or techy.
- Accent color is defined as a single CSS custom property (`--color-accent`) so it can be changed in one line.
- Dark mode support: **mandatory in v1**, implemented via `prefers-color-scheme` media query and CSS custom properties. All colors must be defined as CSS variables with both light and dark variants.

### 6.6 Rich Text Note Editor

- Use **Quill.js** or **TipTap** (lightweight, no framework dependency issues) for the note editor.
- Supported formatting: bold, italic, underline, bullet list, numbered list, headings (H2, H3), links.
- Notes stored as HTML in the database (`TEXT` column).

---

## 7. Google Drive Integration

### 7.1 Setup Overview

Each user account gets a **dedicated folder** in a single Google Drive (the developer's Drive), organized as:

```
My Drive/
└── FileManagerApp/
    ├── user_<userId_1>/
    │   ├── <driveFileId>.jpg
    │   └── <driveFileId>.mp4
    └── user_<userId_2>/
        └── ...
```

### 7.2 Auth Strategy

- Use **OAuth 2.0** with a **single service account** or a **shared OAuth token** that grants the app access to one Google Drive.
- The backend holds the Drive credentials. Users never interact with Google directly.
- Recommended: **OAuth 2.0 with refresh token** stored securely on the backend (env vars or secrets manager).

### 7.3 Drive Operations

| Operation | Drive API Call |
|---|---|
| Upload a file | `POST /upload/drive/v3/files` (multipart) |
| Download a file | `GET /drive/v3/files/{fileId}?alt=media` |
| Delete a file | `DELETE /drive/v3/files/{fileId}` |
| Generate share link | `POST /drive/v3/files/{fileId}/permissions` (role: reader, type: anyone) |
| Get thumbnail | `GET /drive/v3/files/{fileId}?fields=thumbnailLink` |

### 7.4 File Metadata in DB

Drive file IDs are stored in MySQL alongside the object they belong to. The app uses these IDs to construct download/stream URLs via the backend proxy (the frontend never calls Drive directly).

---

## 8. API Design

> All routes are prefixed with `/api/v1`. Auth-required routes need a valid `Authorization: Bearer <token>` header.

### 8.1 Auth Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Login with email + password |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | Yes | Logout and invalidate refresh token |

### 8.2 Folder Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/folders` | Yes | Get root-level folders for current user |
| GET | `/folders/:id` | Yes | Get folder contents (sub-folders + objects) |
| GET | `/folders/:id/breadcrumb` | Yes | Get ancestor path of a folder |
| POST | `/folders` | Yes | Create a new folder |
| PATCH | `/folders/:id` | Yes | Rename or move a folder |
| DELETE | `/folders/:id` | Yes | Soft-delete a folder |

### 8.3 Object Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/objects/:id` | Yes | Get a single object with all media |
| POST | `/objects` | Yes | Create a new object (with note and/or media) |
| PATCH | `/objects/:id` | Yes | Update title or note |
| DELETE | `/objects/:id` | Yes | Soft-delete an object |
| POST | `/objects/:id/media` | Yes | Upload media file(s) to an object |
| DELETE | `/objects/:id/media/:mediaId` | Yes | Remove a media file from an object |
| PATCH | `/objects/:id/move` | Yes | Move object to another folder |

### 8.4 Media Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/media/:id/stream` | Yes | Stream/proxy a media file from Drive |
| GET | `/media/:id/download` | Yes | Download a media file from Drive |
| GET | `/media/:id/thumbnail` | Yes | Get thumbnail URL for a media file |

### 8.5 Trash Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/trash` | Yes | List all trashed items for current user |
| POST | `/trash/:id/restore` | Yes | Restore a folder or object from trash |
| DELETE | `/trash/:id` | Yes | Permanently delete a trashed item |
| DELETE | `/trash` | Yes | Empty trash (all items permanently) |

### 8.6 Share Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/share/folder/:id` | Yes | Generate a share link for a folder |
| DELETE | `/share/folder/:id` | Yes | Revoke a folder's share link |
| PATCH | `/share/folder/:id` | Yes | Toggle download permission on a folder share link |
| POST | `/share/object/:id` | Yes | Generate a share link for an individual object |
| DELETE | `/share/object/:id` | Yes | Revoke an object's share link |
| PATCH | `/share/object/:id` | Yes | Toggle download permission on an object share link |
| GET | `/share/:token` | No | View a shared folder or object (read-only, public) |

### 8.7 Search Route

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search?q=...` | Yes | Search folders, objects, notes by keyword |

### 8.8 Admin Routes

| Method | Path | Auth (Admin only) | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | List all users |
| POST | `/admin/users` | Admin | Create a user account |
| PATCH | `/admin/users/:id` | Admin | Update user info |
| PATCH | `/admin/users/:id/password` | Admin | Reset user password |
| PATCH | `/admin/users/:id/status` | Admin | Activate / deactivate account |
| DELETE | `/admin/users/:id` | Admin | Soft-delete user account |

---

## 9. Database Schema

### 9.1 `users` Table

```sql
CREATE TABLE users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  drive_folder_id VARCHAR(255),          -- Google Drive folder ID for this user
  last_login_at DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   DATETIME                  -- soft delete
);
```

### 9.2 `refresh_tokens` Table

```sql
CREATE TABLE refresh_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,      -- hashed refresh token
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 9.3 `folders` Table

```sql
CREATE TABLE folders (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  parent_id  INT UNSIGNED,              -- NULL = root level
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,                  -- soft delete
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
);
```

### 9.4 `objects` Table

```sql
CREATE TABLE objects (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  folder_id  INT UNSIGNED NOT NULL,
  title      VARCHAR(255) NOT NULL,
  note       TEXT,                      -- HTML from rich text editor; NULL if no note
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,                  -- soft delete
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

### 9.5 `media_files` Table

```sql
CREATE TABLE media_files (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  object_id       INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  drive_file_id   VARCHAR(255) NOT NULL,  -- Google Drive file ID
  original_name   VARCHAR(255) NOT NULL,  -- original filename
  mime_type       VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT UNSIGNED,
  media_type      ENUM('photo', 'audio', 'video') NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME,               -- soft delete (Drive file also deleted)
  FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
);
```

### 9.6 `folder_shares` Table

```sql
CREATE TABLE folder_shares (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folder_id       INT UNSIGNED NOT NULL UNIQUE,
  user_id         INT UNSIGNED NOT NULL,
  token           CHAR(36) NOT NULL UNIQUE,   -- UUID v4
  allow_download  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
);
```

### 9.7 `object_shares` Table

```sql
CREATE TABLE object_shares (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  object_id       INT UNSIGNED NOT NULL UNIQUE,
  user_id         INT UNSIGNED NOT NULL,
  token           CHAR(36) NOT NULL UNIQUE,   -- UUID v4
  allow_download  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
);
```

---

## 10. Project File Structure

```
./                                       # project root (current working directory)
├── client/                          # React frontend (Vite)
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── api/                     # Axios instance + API call functions
│   │   │   ├── auth.js
│   │   │   ├── folders.js
│   │   │   ├── objects.js
│   │   │   ├── media.js
│   │   │   └── admin.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Topbar.jsx
│   │   │   │   └── Breadcrumb.jsx
│   │   │   ├── folders/
│   │   │   │   ├── FolderCard.jsx
│   │   │   │   └── FolderGrid.jsx
│   │   │   ├── objects/
│   │   │   │   ├── ObjectCard.jsx
│   │   │   │   ├── ObjectGrid.jsx
│   │   │   │   └── ObjectDetail.jsx
│   │   │   ├── media/
│   │   │   │   ├── MediaGallery.jsx
│   │   │   │   ├── MediaThumbnail.jsx
│   │   │   │   └── Lightbox.jsx
│   │   │   ├── editor/
│   │   │   │   └── NoteEditor.jsx     # Quill or TipTap wrapper
│   │   │   ├── trash/
│   │   │   │   └── TrashList.jsx
│   │   │   ├── admin/
│   │   │   │   └── UserTable.jsx
│   │   │   └── common/
│   │   │       ├── Button.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── Spinner.jsx
│   │   │       ├── Toast.jsx
│   │   │       └── ConfirmDialog.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RootPage.jsx           # Root folder view
│   │   │   ├── FolderPage.jsx         # Folder contents view
│   │   │   ├── ObjectPage.jsx         # Object detail view
│   │   │   ├── TrashPage.jsx
│   │   │   ├── SharedFolderPage.jsx   # Public share view — folder (no auth)
│   │   │   ├── SharedObjectPage.jsx   # Public share view — object (no auth)
│   │   │   └── AdminPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Auth state + token refresh logic
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useFolders.js
│   │   │   └── useObjects.js
│   │   ├── styles/
│   │   │   ├── variables.css          # CSS custom properties (colors, spacing)
│   │   │   ├── reset.css
│   │   │   ├── global.css
│   │   │   ├── layout.css
│   │   │   ├── card.css
│   │   │   ├── modal.css
│   │   │   └── form.css
│   │   ├── utils/
│   │   │   ├── formatDate.js
│   │   │   └── fileType.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                           # Node.js / Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # MySQL connection pool
│   │   │   └── drive.js              # Google Drive API client setup
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verify middleware
│   │   │   ├── adminOnly.js          # Role guard
│   │   │   ├── upload.js             # Multer config (memory storage)
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── folder.routes.js
│   │   │   ├── object.routes.js
│   │   │   ├── media.routes.js
│   │   │   ├── trash.routes.js
│   │   │   ├── share.routes.js
│   │   │   ├── search.routes.js
│   │   │   └── admin.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── folder.controller.js
│   │   │   ├── object.controller.js
│   │   │   ├── media.controller.js
│   │   │   ├── trash.controller.js
│   │   │   ├── share.controller.js
│   │   │   ├── search.controller.js
│   │   │   └── admin.controller.js
│   │   ├── services/
│   │   │   ├── drive.service.js      # All Drive API calls
│   │   │   └── trash.cleanup.js      # Cron job: auto-delete 30-day trash
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   └── hash.js
│   │   └── app.js                    # Express app setup
│   ├── server.js                     # Entry point
│   ├── .env                          # Environment variables
│   └── package.json
│
├── database/
│   ├── schema.sql                    # Full CREATE TABLE script
│   └── seed.sql                      # Admin account seed
│
└── README.md
```

---

## 11. Google Cloud Setup Guide

### Step 1: Create a Google Cloud Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click **Select a project → New Project**.
3. Name it: `FileManagerApp` (or similar).
4. Click **Create**.

### Step 2: Enable the Google Drive API
1. In the project dashboard, go to **APIs & Services → Library**.
2. Search for **Google Drive API** and click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services → OAuth consent screen**.
2. Select **External** (or Internal if using Google Workspace).
3. Fill in: App name, support email, developer email.
4. Add scopes: `https://www.googleapis.com/auth/drive.file`
   - `drive.file` scope limits access to only files the app creates — more secure than full Drive access.
5. Add your Google account as a **test user** (required while in testing mode).

### Step 4: Create OAuth 2.0 Credentials
1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Add Authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production, when ready)
4. Download the JSON credentials file.
5. Extract `client_id`, `client_secret` — add to `.env`.

### Step 5: Get a Refresh Token (One-Time Setup)
Since the app uses one Google Drive on behalf of the backend:
1. Use the **OAuth 2.0 Playground** (or a small setup script) to authorize the app with your personal Google account.
2. Exchange the auth code for an access token + **refresh token**.
3. Store the refresh token in `.env`. The backend will use this to always get fresh access tokens without user interaction.

> [!CAUTION]
> Never commit the refresh token or any credentials to Git. Use `.gitignore` to exclude `.env`.

---

## 12. Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=file_manager
DB_USER=root
DB_PASS=yourpassword

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth / Drive
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_root_folder_id   # ID of "FileManagerApp" folder in Drive

# File Upload
MAX_FILE_SIZE_MB=50

# App
CLIENT_URL=http://localhost:3000
```

---

## 13. Implementation Phases

### Phase 1 — Foundation (Backend + Auth)
- [ ] MySQL schema setup
- [ ] Express app scaffold with error handling and CORS
- [ ] Auth routes: login, refresh, logout
- [ ] JWT middleware and admin guard
- [ ] Google Drive client setup + test upload

### Phase 2 — Core Backend (Folders & Objects)
- [ ] Folder CRUD routes + controllers
- [ ] Object CRUD routes + controllers
- [ ] Media upload → Drive + save metadata to DB
- [ ] Media stream/download proxy route
- [ ] Soft-delete logic for folders and objects

### Phase 3 — Frontend Foundation
- [ ] Vite + React project setup
- [ ] CSS custom properties and global styles
- [ ] Auth context, login page, protected routes
- [ ] API layer (Axios instance with interceptor for token refresh)

### Phase 4 — Frontend Core Features
- [ ] Root page (folder grid)
- [ ] Folder page (sub-folders + object cards with previews)
- [ ] Object detail page (note + media gallery)
- [ ] Create / edit / delete modals for folders and objects
- [ ] Breadcrumb navigation

### Phase 5 — Trash & Share
- [ ] Trash page + restore / permanent delete
- [ ] 30-day auto-cleanup cron job
- [ ] Share link generation and public shared folder view

### Phase 6 — Admin Panel & Search
- [ ] Admin user management page
- [ ] Global search route + search UI

### Phase 7 — Polish & Testing
- [ ] Dark mode (mandatory — all CSS variables must have light + dark variants)
- [ ] Mobile layout testing and fixes
- [ ] Error states and loading skeletons
- [ ] Input validation (frontend + backend)
- [ ] API rate limiting and security headers (`helmet.js`)

---

> [!NOTE]
> This document is the single source of truth for the project. Update it as requirements evolve before starting each implementation phase.
