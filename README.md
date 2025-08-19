# Linkora Backend

A Node.js + Express backend powering **Linkora** (formerly Linkora), a campus-focused social networking platform.  
It provides APIs for **auth (Firebase)**, **profiles & search (Firestore)**, **real-time chat (GetStream)**, and **media uploads (Cloudinary)**—with comprehensive logging and development tools.

> 🎯 Goal: connect students by talents/interests, enable messaging, and share achievements inside the university.

---

## ✨ Features

- **Auth**: Firebase Auth (JWT verification on server)
- **Database**: Firestore (users, profiles, conversations, posts)
- **Chat**: GetStream + Socket.IO (real-time messaging)
- **Media**: Cloudinary (image uploads, transformations)
- **Logging**: Built-in logging system with color coding
- **Security**: CORS, cookie parsing, environment-based config
- **Dev Tools**: Nodemon for development, Jest for testing

---

## 🧱 Tech Stack

- **Runtime**: Node.js (JavaScript)
- **Framework**: Express.js v5
- **Auth**: Firebase Admin SDK
- **Database**: Firestore
- **Real-time**: Socket.IO + GetStream
- **Media**: Cloudinary Node SDK
- **HTTP Client**: Axios
- **Utilities**: Colors (logging), Cookie Parser, CORS, Dotenv
- **Dev Tools**: Nodemon, Jest
- **Deployment**: Choreo-ready

---

## 📦 Folder Structure

```
linkora-backend/
├─ assest/                  # Static assets
├─ config/                  # Configuration files
├─ controllers/             # Route controllers
├─ logs/                    # Application logs
├─ middleware/              # Express middlewares
├─ model/                   # Data models
├─ node_modules/            # Dependencies
├─ routes/                  # API routes
├─ userController/          # User-specific controllers
├─ utils/                   # Utility functions
├─ .env                     # Environment variables
├─ .gitignore              # Git ignore rules
├─ choreo.yaml             # Choreo deployment config
├─ index.js                # Main application entry point
├─ package.json            # NPM dependencies and scripts
├─ package-lock.json       # Locked dependency versions
└─ README.md               # Project documentation
```

---

## 🚀 Getting Started

### 1) Prerequisites
- Node.js **LTS** (v18+) / Express.js
- npm
- A Firebase project with **Firebase Auth** & **Firestore**
- **Cloudinary** account (cloud name, key, secret)
- **GetStream** account (app id, key, secret)

### 2) Install
```bash
git clone https://github.com/ATgayan/Linkora-be.git
cd Linkora-be
npm install
```

### 3) Environment Variables
Create a `.env` file (never commit real secrets). Use this template:

```env
# Super Admin Configuration
SUPERADMIN=admin@admin.com

# Firebase Configuration
FIREBASEAPIKEY=your_firebase_api_key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your_project_id","private_key_id":"your_private_key_id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n","client_email":"your_client_email","client_id":"your_client_id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"your_client_cert_url","universe_domain":"googleapis.com"}

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# GetStream (Chat) Configuration
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# Admin Credentials
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=your_admin_password
```

🔐 Keep secrets out of Git. Use `.env.local` and CI/CD secret stores in production.

### 4) Run
```bash
npm start
# or if you have a dev script
npm run dev
```

- Visit: http://localhost:5000/api/health → `{ status: "ok" }`
- Main entry point: `index.js`

---

## 📚 Documentation

- **Swagger UI** available at `/api-docs`
- **Postman**: Import `./docs/Linkora.postman_collection.json` (add yours)

Example Swagger bootstrap (TypeScript):

```typescript
// src/docs/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Linkora API", version: "1.0.0" },
    servers: [{ url: "http://localhost:5000" }],
    components: {
      securitySchemes: {
        firebaseAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ firebaseAuth: [] }]
  },
  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts"],
});
```

---

## 🔐 Auth (Firebase)

Frontend obtains Firebase ID Token after login.

Backend verifies token with Firebase Admin middleware:

```typescript
// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import admin from "../config/firebase";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

---

## 🗄️ Database (Firestore)

**Collections (suggested)**: `users`, `profiles`, `skills`, `posts`, `conversations`, `messages`

- Use server-side validation
- Index hot queries (by university, skills, interests)

---

## 🖼️ Media (Cloudinary)

Use official docs to set up: Cloudinary → Console → Account Details → API Keys

Server upload endpoint example:

```typescript
// src/routes/media.routes.ts
import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/media/upload", upload.single("file"), async (req, res) => {
  try {
    const file = `data:${req.file?.mimetype};base64,${req.file?.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(file, { folder: "linkora" });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
```

📖 **Cloudinary Docs**: Dashboard → Documentation → Node SDK → Upload API.

---

## 💬 Chat (GetStream)

Backend generates user/chat tokens and creates channels as needed.

Sample token route:

```typescript
// src/routes/chat.routes.ts
import { Router } from "express";
import { StreamChat } from "stream-chat";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/chat/token", requireAuth, async (req, res) => {
  const client = StreamChat.getInstance(process.env.STREAM_API_KEY!, process.env.STREAM_API_SECRET!);
  const userId = (req as any).user.uid; // from Firebase
  const token = client.createToken(userId);
  res.json({ userId, token });
});

export default router;
```

📖 **GetStream Docs**: Dashboard → Chat → Server SDK → Node.js (auth/token & channels).

---

## 🔗Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | ❌ | Healthcheck |
| GET | `/api/users/:id` | ✅ | Get user profile |
| PUT | `/api/users/:id` | ✅ | Update user profile |
| GET | `/api/search?skill=UI` | ✅ | Search users by skill/interest |
| POST | `/api/media/upload` | ✅ | Upload image to Cloudinary |
| POST | `/api/chat/token` | ✅ | Get GetStream user token |
| POST | `/api/chat/channels` | ✅ | Create/ensure channel |

All ✅ routes expect `Authorization: Bearer <Firebase_ID_Token>`.

---

## 🧪 Dev & Scripts

Based on your `package.json`:

```json
{
  "name": "campus_connect",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "jest",
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

**Key Dependencies**:
- `express` v5.1.0 - Web framework
- `firebase-admin` v13.4.0 - Firebase integration
- `cloudinary` v2.7.0 - Media management
- `stream-chat` v9.14.0 - Chat functionality
- `socket.io` v4.8.1 - Real-time communication
- `colors` v1.4.0 - Console logging colors
- `axios` v1.9.0 - HTTP requests

**Development Tools**:
- `nodemon` v3.1.10 - Auto-restart server
- `jest` v30.0.5 - Testing framework

---

## 🛡️ Security & Production Notes

- Enable CORS for known frontends only
- Add Helmet & rate limiting
- Store secrets in CI/CD secret manager (not in `.env`)
- For Firebase private key, ensure newline escaping `\n` when stored in env
- Configure Firestore indexes for frequent queries
- Log only non-sensitive data

---

## ☁️ Deployment

#### You can deploy the Linkora backend to Vercel, Render, Fly.io, or Azure App Service.

- Use HTTPS and set appropriate CORS origins for production frontend
- Consider Cloudinary upload presets and GetStream permissions as you scale

---

## 🧰 Troubleshooting

- **Invalid Firebase token** → Ensure frontend sends fresh ID token from Firebase Auth; check server time sync
- **Cloudinary upload fails** → Verify cloud name, key, secret; ensure file size within limits
- **GetStream 403** → Check API key/secret; ensure userId used to create token matches frontend user
- **Firestore permission issues** → If using Firestore security rules, make sure Admin SDK runs with service account

🔧 For debugging, we occasionally consulted Claude 3.7 Sonnet and ChatGPT to resolve edge cases and improve DX.

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/<name>`
3. Commit: `git commit -m "feat: add <something>"`
4. Push: `git push origin feat/<name>`
5. Open a Pull Request

---

## 👨‍💻 Authors

- **Thusitha Gayan** – Backend Developer  
  GitHub: https://github.com/ATgayan

---

## 🔎 References

- [Cloudinary Docs](https://cloudinary.com/documentation) → Node SDK & Upload API
- [GetStream Chat Docs](https://getstream.io/chat/docs/) → Node Server SDK & Tokens
- [Firebase Admin SDK](https://firebase.google.com/docs/admin) → Auth & Firestore
