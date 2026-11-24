# Family File Manager (Personal Archive)

A tailored, mobile-first personal file manager built for Gebeyaw's father to store and organize notes, memories, photos, audios, and videos in a structured nested folder system backed by Google Drive and MySQL.

---

## Architecture & Features

- **Frontend**: React + Vite, **pure plain CSS** (zero styling framework).
- **Aesthetic**: Warm earth/terracotta palette (no AI blue-purple gradient clichés).
- **Dark Mode**: **Mandatory in v1**, fully supported via CSS variables and toggleable in the header.
- **Backend**: Node.js + Express with JWT (access token) + HTTP-only refresh cookies.
- **Authentication**: Salt rounds **11** with bcrypt. Admin-managed user accounts with separate spaces.
- **Database**: MySQL schema with tables: `users`, `refresh_tokens`, `folders`, `objects`, `media_files`, `folder_shares`, `object_shares`.
- **Google Drive Integration**: Media uploaded to Google Drive folder per user; includes local storage fallback if Google Cloud credentials are pending.
- **Media Previews & Lightbox**:
  - Photo thumbnails on cards.
  - Video preview with first frame and play-icon overlay.
  - Audio waveform card view and inline audio player.
  - Fullscreen lightbox with **zoom (0.5x – 4.0x)**, rotate, reset, and pan controls.
- **Sharing**:
  - Folder and individual object share links (UUID-based).
  - **No-download by default** (read-only view); owner can toggle download permission on or off.
- **Trash**: Soft-delete system with **30-day auto-purge** cron job, item restoration, and permanent delete.
- **Global Search**: Search matches folder names, object titles, note text, and media file names.

---

## Getting Started

### 1. Database Setup (MySQL)
1. Ensure your local MySQL server is running.
2. The server will **automatically create the database tables and default admin account** when started.
3. If you prefer to run the SQL script manually, run:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

### 2. Environment Variables
Check `server/.env` and update with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=file_manager
DB_USER=root
DB_PASS=yourpassword
```

For Google Drive integration, follow the Google Cloud setup instructions in [requirement_v1.md](requirement_v1.md) and fill in:
```env
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REFRESH_TOKEN=your_token
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_drive_root_folder_id
```
*(Note: If Google credentials are not set yet, files will safely be stored in `server/uploads/` so you can test right away!)*

### 3. Run the Backend Server
```bash
npm run server:dev
```
Backend runs on `http://localhost:5000`. Default admin user created automatically:
- **Email**: `admin@filemanager.local`
- **Password**: `Admin1234!`

### 4. Run the Frontend Client
In a second terminal:
```bash
npm run client
```
Frontend runs on `http://localhost:5173`.
