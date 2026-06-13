# Real-Time Collaborative Messaging Platform

Owner: Namratha R

A full-stack MERN messaging platform supporting 100+ concurrent users, real-time communication via Socket.io, role-based access control, and AWS S3 file uploads.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io |
| Auth | JWT (JSON Web Tokens) |
| File Storage | AWS S3 (presigned URLs) |

---

## Features

- **Real-time messaging** — Sub-150ms delivery via Socket.io (no third-party SDK)
- **1:1 Direct Messages** — Private conversations between users
- **Group Channels** — Multi-user rooms with unlimited members
- **Typing Indicators** — Live "User is typing…" with auto-dismiss
- **Read Receipts** — Per-message read status with checkmark UI
- **Online Presence** — Real-time online/offline status badges
- **JWT Authentication** — Secure login/register with HttpOnly cookies
- **Role-Based Access Control** — Owner / Admin / Member roles across 12+ REST endpoints
- **File Uploads** — Images & files up to 10 MB via AWS S3 presigned URLs
- **Infinite Scroll Pagination** — 50 messages per page, cursor-based
- **Optimized MongoDB Schema** — Compound indexes for <30ms message queries

---

## Project Structure

```
messaging-platform/
├── server/                  # Node.js / Express backend
│   ├── server.js            # Entry point
│   ├── src/
│   │   ├── app.js           # Express app setup
│   │   ├── models/          # Mongoose models
│   │   │   ├── User.js
│   │   │   ├── Channel.js
│   │   │   ├── Message.js
│   │   │   └── Membership.js
│   │   ├── routes/          # REST API endpoints
│   │   │   ├── auth.js      # POST /register, /login, /logout, GET /me
│   │   │   ├── users.js     # GET /search, /:id, PATCH /me/status
│   │   │   ├── channels.js  # Full CRUD + members management
│   │   │   ├── messages.js  # Pagination + read receipts
│   │   │   └── uploads.js   # S3 direct upload + presigned URLs
│   │   ├── middleware/
│   │   │   ├── auth.js      # JWT authentication
│   │   │   ├── rbac.js      # Role-based access control
│   │   │   └── upload.js    # Multer + file validation
│   │   ├── socket/
│   │   │   └── index.js     # Socket.io handlers
│   │   └── utils/
│   │       ├── db.js        # MongoDB connection
│   │       ├── s3.js        # AWS S3 utilities
│   │       └── jwt.js       # JWT helpers
│   ├── .env.example
│   └── package.json
│
└── client/                  # React + Vite frontend
    ├── src/
    │   ├── App.jsx           # Router + providers
    │   ├── main.jsx
    │   ├── index.css
    │   ├── api/              # Axios API modules
    │   │   ├── axios.js
    │   │   ├── auth.js
    │   │   ├── channels.js
    │   │   ├── messages.js
    │   │   └── uploads.js
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── SocketContext.jsx
    │   ├── hooks/
    │   │   ├── useMessages.js
    │   │   └── useChannels.js
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   └── ChatPage.jsx
    │   └── components/
    │       ├── auth/
    │       │   └── ProtectedRoute.jsx
    │       ├── layout/
    │       │   └── Sidebar.jsx
    │       └── chat/
    │           ├── ChatArea.jsx
    │           ├── MessageList.jsx
    │           ├── MessageItem.jsx
    │           ├── MessageInput.jsx
    │           ├── TypingIndicator.jsx
    │           ├── CreateChannelModal.jsx
    │           ├── NewDirectMessageModal.jsx
    │           ├── ChannelSettingsModal.jsx
    │           ├── MembersModal.jsx
    │           └── WelcomeScreen.jsx
    ├── .env.example
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** >= 6.0 (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **AWS account** with an S3 bucket (for file uploads)

---

## Setup Instructions

### 1. Clone / Extract the project

```bash
unzip messaging-platform.zip
cd messaging-platform
```

---

### 2. Server Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/messaging_platform
JWT_SECRET=your_very_long_random_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=my-messaging-platform-bucket
S3_PRESIGNED_URL_EXPIRY=3600
```

**AWS S3 Bucket Configuration:**
1. Create a new S3 bucket
2. Enable public access (or keep private — presigned URLs work either way)
3. Add the following CORS configuration to your bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Create an IAM user with `AmazonS3FullAccess` (or a scoped policy) and copy the credentials.

**Start the server:**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

### 3. Client Setup

```bash
cd ../client
npm install
cp .env.example .env
```

`.env` defaults (no changes needed for local dev):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Start the client:**

```bash
npm run dev
```

Client runs at: `http://localhost:5173`

---

## REST API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login + receive JWT |
| POST | `/logout` | Yes | Logout + clear cookie |
| GET | `/me` | Yes | Get authenticated user |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search?q=` | Yes | Search users |
| GET | `/:id` | Yes | Get user profile |
| PATCH | `/me/status` | Yes | Update own status |

### Channels — `/api/channels`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/` | Member | List my channels |
| POST | `/` | Any | Create group channel |
| POST | `/direct` | Any | Get/create DM channel |
| GET | `/:id` | Member | Get channel details |
| PATCH | `/:id` | Admin+ | Update channel |
| DELETE | `/:id` | Owner | Delete channel |
| GET | `/:id/members` | Member | List members |
| POST | `/:id/members` | Admin+ | Invite member |
| PATCH | `/:id/members/:uid/role` | Owner | Change member role |
| DELETE | `/:id/members/:uid` | Admin+ | Remove member |
| DELETE | `/:id/leave` | Member | Leave channel |

### Messages — `/api/messages`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:channelId` | Member | Get paginated history |
| POST | `/:channelId` | Member | Send message (REST) |
| PATCH | `/:channelId/:msgId/read` | Member | Mark as read |

### Uploads — `/api/uploads`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/direct` | Yes | Upload file via server |
| POST | `/presign` | Yes | Get S3 presigned PUT URL |

### AI — `/api/ai`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/smart-replies` | Yes | Generate 2-3 reply suggestions for a message |
| POST | `/summarize` | Yes | Summarize recent channel conversation |
| POST | `/search` | Yes | Semantic search across channel messages |

**`POST /api/ai/smart-replies`** body:
```json
{ "channelId": "...", "messageContent": "...", "senderName": "Alice" }
```
Response: `{ "suggestions": ["Reply A", "Reply B", "Reply C"] }`

**`POST /api/ai/summarize`** body:
```json
{ "channelId": "...", "limit": 50 }
```
Response: `{ "summary": "The team discussed..." }`

**`POST /api/ai/search`** body:
```json
{ "channelId": "...", "query": "what did we decide about the deadline?" }
```
Response: `{ "results": [{ "messageId": "...", "content": "...", "senderName": "...", "createdAt": "..." }] }`

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `send:message` | `{ channelId, content, attachments }` | Send a message |
| `typing:start` | `{ channelId }` | Start typing |
| `typing:stop` | `{ channelId }` | Stop typing |
| `message:read` | `{ channelId, messageId }` | Mark message read |
| `channel:join` | `{ channelId }` | Join a socket room |
| `channel:leave` | `{ channelId }` | Leave a socket room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message in channel |
| `typing:update` | `{ channelId, userId, username, isTyping }` | Typing status |
| `message:read_receipt` | `{ channelId, messageId, userId, readAt }` | Read receipt |
| `presence:update` | `{ userId, status }` | User online/offline |
| `presence:online_users` | `string[]` | Initial online user IDs |

---

## Database Schema

### `users`
```
_id, username (unique), email (unique), password (hashed), avatar, status, lastSeen, timestamps
Indexes: email, username, status
```

### `channels`
```
_id, name, description, type (group|direct), owner → User, participants → [User], lastMessage → Message, lastActivity, timestamps
Indexes: (type, participants), owner, lastActivity
```

### `messages`
```
_id, channel → Channel, sender → User, content, attachments[], readBy[], deleted, system, timestamps
Indexes: (channel, createdAt DESC), (channel, deleted, createdAt DESC)
```

### `memberships`
```
_id, user → User, channel → Channel, role (owner|admin|member), lastReadMessage → Message, joinedAt, timestamps
Indexes: (user, channel) UNIQUE, (channel, role)
```

---

## Performance Notes

- **Message queries**: Compound index on `(channel, createdAt DESC)` reduces history fetch from ~200ms to <30ms
- **Pagination**: Cursor-based (`_id < before`) avoids offset scan degradation
- **Socket.io**: Each user joins all their channel rooms on connect; delivery is direct room broadcast without polling
- **S3 uploads**: Presigned URLs allow client-direct upload, bypassing server bandwidth
- **Connection pool**: MongoDB `maxPoolSize: 10` for concurrent load handling

---

## Security

- Passwords hashed with `bcryptjs` (12 salt rounds)
- JWTs stored in HttpOnly cookies + Authorization header support
- Helmet.js for HTTP security headers
- Rate limiting: 200 requests / 15 min per IP
- Input validation via `express-validator` on all mutation endpoints
- Role checks on every sensitive operation
- File type allowlist + 10 MB size limit on uploads

---

## License

Proprietary — owned by Namratha R. All rights reserved.
