# Secure File Hosting Web Application

A full-stack project that lets users register, log in, upload PDF/MP4 files (public or private), list and delete their files, and download public files — built with **Node.js/Express**, **MongoDB (Mongoose)**, **JWT**, **Multer**, and vanilla **HTML/CSS/JS**.

> Implements the exact functional requirements from the assignment brief (register/login, upload with privacy, public downloads, My Files with delete, database integration, validation, and security checks).

## Project Structure
secure-file-hosting/
  backend/
    server.js
    .env.example
    package.json
    src/
      middleware/auth.js
      models/{User.js, File.js}
      routes/{auth.js, files.js}
  uploads/                 # runtime uploaded files
  frontend/
    index.html
    styles.css
    app.js

## 1) Prerequisites
- Node.js 18+
- MongoDB running locally (or use Atlas and set MONGO_URI)

## 2) Setup & Run

### Backend
cd backend
cp .env.example .env
# edit .env to set MONGO_URI and JWT_SECRET as needed

npm install
# If you have a dev script using nodemon:
# npm run dev
# Otherwise:
node server.js

# Backend runs at http://localhost:5000

### Frontend (choose ONE)
# A) Serve via Express (recommended, one port)
# Add to backend/server.js:
#   app.use(express.static(path.join(__dirname, "../frontend")));
# Then open:
http://localhost:5000

# B) Serve as static site
cd frontend
npx serve .
# Open the URL printed (e.g., http://localhost:3000)

## 3) Usage Flow
- Register a user (Register section in the single-page UI)
- Login → JWT stored in localStorage
- Upload a file (PDF/MP4), choose Public or Private
- My Files shows your uploads with Download/Delete and Copy link
- Files lists public files for anyone
- Use the top share-bar to open a private share link
- Logout in the nav

## 4) API Endpoints
POST   /api/register
POST   /api/login
POST   /api/upload?privacy=public|private         (auth, field: file)
GET    /api/public-files
GET    /api/my-files                              (auth)
GET    /api/files/:id/download                    (public or owner if private)
GET    /api/files/share/:shareId/download         (private via share link, no auth)
DELETE /api/files/:id                             (auth, owner only)

## 5) Security & Validation
- Passwords hashed with bcrypt
- JWT in localStorage; send as `Authorization: Bearer <token>`
- Multer MIME allowlist: application/pdf, video/mp4
- Max file size: 20MB (env: MAX_FILE_SIZE_MB)
- Filenames sanitized; downloads stream with original name
- Private downloads require owner token or share link
- No sensitive fields in API responses

## 6) Troubleshooting
- MongoDB connection error → ensure service is running or update MONGO_URI
- Windows “Access is denied” starting MongoDB → open PowerShell as Administrator or run `mongod` directly
- “Unsupported file type” → only PDF and MP4 allowed
- 413 / size error → file exceeds MAX_FILE_SIZE_MB
- Share links: copy the link from My Files, or paste a share ID/URL into the top share-bar

## 7) Notes
- `/uploads` is served for download streaming only; listings come from MongoDB.
- Private files are never shown on the public Files page.
