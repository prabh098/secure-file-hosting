# Secure File Hosting Web Application

A full-stack project that lets users register, log in, upload PDF/MP4 files (public or private), list and delete their files, and download public files — built with **Node.js/Express**, **MongoDB (Mongoose)**, **JWT**, **Multer**, and vanilla **HTML/CSS/JS**.

> Implements the exact functional requirements from the assignment brief (register/login, upload with privacy, public downloads, My Files with delete, database integration, validation, and security checks).

## Project Structure

```
secure-file-hosting/
  backend/
    server.js
    .env.example
    package.json
    src/
      middleware/auth.js
      models/{User.js, File.js}
      routes/{auth.js, files.js}
  uploads/               # runtime files stored here
  frontend/
    index.html
    register.html
    login.html
    upload.html
    my-files.html
    downloads.html
    styles.css
    auth.js
```

## 1) Prerequisites

- Node.js 18+
- MongoDB running locally (or replace `MONGO_URI` in `.env` with Atlas/remote)

## 2) Setup & Run

### Backend
```bash
cd backend
cp .env.example .env
# edit .env to set MONGO_URI and JWT_SECRET if you want

npm install
npm run dev   # or: npm start
```
Backend will start on `http://localhost:5000`.

### Frontend
Open these files directly in your browser (double-click or `File -> Open`):
- `frontend/index.html`
- `frontend/register.html`
- `frontend/login.html`
- `frontend/upload.html`
- `frontend/my-files.html`
- `frontend/downloads.html`

> CORS is enabled on the backend. The frontend uses `http://localhost:5000/api` by default.

## 3) Usage Flow (for your demo video)

1. **Register** a user (Register page)  
2. **Login** (Login page) → token is saved to browser `localStorage`  
3. **Upload** a file (Upload page) – choose **Public** or **Private**  
   - Allowed types: **PDF** and **MP4**  
   - Max size: **20MB** (configurable via `.env`)  
4. **My Files** shows your uploads with **Download** and **Delete** buttons  
   - Private files show a **share link** (copy & send to others)  
5. **Downloads** lists **public files** for anyone to download  
6. **Logout** from the nav

## 4) API Endpoints

- `POST /api/register` — create user (email unique)
- `POST /api/login` — returns JWT token
- `POST /api/upload?privacy=public|private` — **auth required**, field name `file`
- `GET  /api/public-files` — list public files
- `GET  /api/my-files` — **auth required**, list own files
- `GET  /api/files/:id/download` — download; public for anyone, private for **owner only** (via token)
- `GET  /api/files/share/:shareId/download` — download private via **shareable link** (no auth)
- `DELETE /api/files/:id` — **auth required**, owner only

## 5) Security & Validation

- Passwords **hashed** with bcrypt
- JWT stored client-side in **localStorage**; sent as `Authorization: Bearer <token>`
- Multer restricts **MIME types** (`application/pdf`, `video/mp4`) and enforces **20MB** max size
- Sanitized saved filenames; downloads served with original names
- Private downloads gated by **owner token** or **shareId** link
- No sensitive fields returned in responses

## 6) Troubleshooting

- **MongoDB connection error**: Ensure MongoDB is running locally or change `MONGO_URI` in `.env`
- **Access denied on Windows** when starting MongoDB service: open PowerShell **as Administrator**, or run `mongod` directly
- **"Unsupported file type"**: only `.pdf` and `.mp4` accepted
- **413/Limit**: file exceeds `MAX_FILE_SIZE_MB`

## 7) Notes

- The `uploads` directory is served at `/uploads` for download streaming only; listing must come from DB.
- You can host the frontend with any static server if preferred (`npx serve frontend`).

---

Happy building!
