# 🏘️ ConnectNeighbour — Backend API

<div align="center">

**Express.js + MongoDB REST API powering India's hyper-local neighborhood social network.**

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white&style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white&style=for-the-badge)](https://www.mongodb.com/)
[![AWS SES](https://img.shields.io/badge/AWS-SES-FF9900?logo=amazonaws&logoColor=white&style=for-the-badge)](https://aws.amazon.com/ses/)

</div>

---

## 📌 About the Project

This is the **Node.js + Express REST API backend** for ConnectNeighbour. It handles authentication, profile management, geo-based neighbor discovery, connection requests, contact form queries, and transactional email via AWS SES.

---

## 🗂️ Project Structure

```
devTinder/
├── src/
│   ├── app.js                # Main Express app — CORS, middleware, router mounting, DB connect
│   ├── config/
│   │   └── database.js       # Mongoose connection helper
│   ├── middlewares/
│   │   └── auth.js           # JWT cookie authentication middleware
│   ├── models/
│   │   ├── user.js           # User Mongoose schema (profile, location, gallery, skills)
│   │   ├── connectionRequest.js  # Connection request schema (sender, receiver, status)
│   │   └── contact.js        # Contact form query schema
│   ├── routes/
│   │   ├── auth.js           # POST /signup, /login, /auth/google, /logout
│   │   ├── profile.js        # GET/PATCH /profile/view, /profile/edit, /profile/location
│   │   ├── request.js        # POST /request/send, /request/review
│   │   ├── user.js           # GET /user/feed, /user/connections, /user/requests, /user/nearby
│   │   └── contact.js        # POST /contact (public, saves to DB + emails user)
│   └── utils/
│       ├── validation.js     # Signup data validation helpers
│       ├── sendEmail.js      # SES email sender wrapper
│       └── sesClient.js      # AWS SES client configuration
├── .env                      # Environment variables (never commit)
├── .gitignore
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v22+
- **MongoDB Atlas** cluster (or local MongoDB)
- **AWS SES** account with a verified sending email

### 1. Clone & install
```bash
git clone https://github.com/ANSHU-PALIWAL/connectneighbour-api.git
cd devTinder
npm install
```

### 2. Configure environment variables
Create a `.env` file:

```env
PORT=4000
DB_CONNECTION_SECRET=mongodb+srv://<user>:<pass>@cluster.mongodb.net/connectneighbour
JWT_SECRET_KEY=your_very_long_random_secret_here

GOOGLE_CLIENT_ID=your_google_oauth_client_id

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
SES_FROM_EMAIL=hello@connectneighbour.in

NODE_ENV=development
```

### 3. Run development server
```bash
npm run dev     # nodemon with hot reload
# → http://localhost:4000
```

### 4. Run production
```bash
npm start       # node src/app.js
```

---

## 🌍 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Port the server listens on |
| `DB_CONNECTION_SECRET` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET_KEY` | ✅ | Secret for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 Client ID (must match frontend) |
| `AWS_REGION` | ✅ | AWS region for SES (e.g. `ap-south-1`) |
| `AWS_ACCESS_KEY_ID` | ✅ | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS IAM secret key |
| `SES_FROM_EMAIL` | ✅ | Verified SES sender email |
| `NODE_ENV` | ✅ | `development` or `production` (affects cookie flags) |

---

## 📡 API Endpoints

### Auth (`/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signup` | ❌ | Register with email + password |
| POST | `/login` | ❌ | Login with email + password |
| POST | `/auth/google` | ❌ | Google OAuth login/signup |
| POST | `/logout` | ❌ | Clear session cookie |

### Profile (`/profile`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/profile/view` | ✅ | Get own full profile |
| PATCH | `/profile/edit` | ✅ | Update profile fields (name, age, gender, bio, skills, photo, gallery) |
| PATCH | `/profile/location` | ✅ | Update lat/lng coordinates |

### Connection Requests (`/request`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/request/send/:status/:userId` | ✅ | Send `connect` or `pass` request |
| POST | `/request/review/:status/:requestId` | ✅ | `accepted` or `rejected` a received request |

### User Data (`/user`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/feed` | ✅ | Paginated feed — users not yet seen |
| GET | `/user/connections` | ✅ | All mutual connections |
| GET | `/user/requests/received` | ✅ | Incoming pending connection requests |
| GET | `/user/nearby` | ✅ | All users within 100km (geospatial query) |

### Contact (`/contact`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/contact` | ❌ | Submit a contact query (saved to DB, acknowledgement email sent) |

---

## 🗄️ Database Schemas

### User
```
firstName, lastName, emailId*, password (bcrypt), age, gender
photoUrl, gallery (max 6), location {type: Point, coordinates}
about, skills[], mobileNumber
```
*Indexes: `{firstName, lastname, gender, age}` + `{location: "2dsphere"}`

### ConnectionRequest
```
fromUserId (ref: User)*, toUserId (ref: User)*, status (ignored|interested|accepted|rejected)*
```
*Compound index: `{fromUserId, toUserId}` unique

### Contact
```
name*, email*, subject*, message*, status (new|read|replied, default: new)
timestamps: createdAt, updatedAt
```

---

## 🏗️ Architecture Notes

### Middleware
- `cors` — configured for `http://localhost:5173` (dev) and production domain
- `express.json` — 50mb limit (for base64 image uploads)
- `cookieParser` — parses JWT from `token` cookie
- `auth.js` middleware — validates JWT, attaches `req.user` on protected routes

### Authentication
- JWT stored in an **HTTP-only cookie** (`token`, 8-hour expiry)
- `secure: true` + `sameSite: "none"` in production; `lax` in development
- Google OAuth verified via `google-auth-library` OAuth2Client on server side

### Email Service (AWS SES)
- `sesClient.js` — creates `SESClient` from env credentials
- `sendEmail.js` — `run(to, subject, html)` helper used by auth & contact routes
- Used for: welcome email on signup, contact form acknowledgement

### Geo-Awareness
- User `location` is a GeoJSON `Point` field with a `2dsphere` index
- `/user/nearby` uses MongoDB `$nearSphere` operator for 100km radius queries
- Location is updated from the client via `PATCH /profile/location` on every app load

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `express` v5 | HTTP server framework |
| `mongoose` v8 | MongoDB ODM |
| `bcrypt` v6 | Password hashing |
| `jsonwebtoken` | JWT generation + verification |
| `cookie-parser` | Parse tokens from cookies |
| `cors` | Cross-origin resource sharing |
| `validator` | Input validation (email, phone, strong password) |
| `google-auth-library` | Server-side Google OAuth token verification |
| `@aws-sdk/client-ses` | AWS SES email sending |
| `nodemailer` | Email transport (complementary) |
| `dotenv` | Environment variable loading |
| `nodemon` (dev) | Auto-restart on file changes |

---

## 📄 License

ISC © [Priyanshu Paliwal](https://www.linkedin.com/in/priyanshu-paliwal-017a6a262/)
