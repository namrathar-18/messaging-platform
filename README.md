# PingLink AI

Owner: Namratha R

PingLink AI is an AI-powered real-time messaging and team collaboration web application built with the MERN stack. It supports direct messages, group channels, file sharing, voice notes, stories/status updates, AI assistance, role-based channel access, and a responsive chat interface.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How The Website Works](#how-the-website-works)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [How To Run Locally](#how-to-run-locally)
- [Testing The App Flow](#testing-the-app-flow)
- [API Overview](#api-overview)
- [Socket.io Events](#socketio-events)
- [Troubleshooting](#troubleshooting)
- [Live Hosting Guide](#live-hosting-guide)
- [Future Enhancements](#future-enhancements)

## Project Overview

PingLink AI is designed as a messaging-focused collaboration platform, similar in direction to Slack or Microsoft Teams, but with AI features included for productivity.

The app has three main parts:

- Frontend: React + Vite application used by users in the browser
- Backend: Express API and Socket.io server for auth, chat, channels, uploads, AI, and real-time events
- Database: MongoDB for users, channels, memberships, messages, stories, and metadata

## Features

- User registration and login using JWT authentication
- Protected chat dashboard after login
- Real-time 1:1 direct messaging
- Group channels for team collaboration
- Create, update, delete, join, and leave channel workflows
- Owner, admin, and member roles for channel access control
- Member management inside group channels
- Live online/offline presence indicators
- Typing indicators
- Read receipts
- Message pagination for chat history
- File and image sharing through server uploads
- Upload previews in the message composer
- Editable user profile
- Profile photo support
- User blocking and unblocking for direct messages
- Voice note recording and playback
- Audio/video call interface
- Stories/status tray
- AI assistant mentions using `@ai-assistant`
- AI smart reply suggestions
- AI conversation summaries
- AI semantic conversation search
- Responsive desktop and mobile layout
- Dark and light theme support
- Modern glass-style UI
- Production environment examples and deployment notes

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time | Socket.io |
| Authentication | JWT |
| AI | Gemini gateway integration |
| Uploads | Multer + local server uploads |

## Project Structure

```text
messaging-platform/
  client/
    public/
      favicon.svg
      intellicollab-logo.svg
    src/
      api/
        auth.js
        axios.js
        channels.js
        messages.js
        stories.js
        uploads.js
      components/
        auth/
        brand/
        chat/
        layout/
        ui/
      context/
        AuthContext.jsx
        SocketContext.jsx
        ThemeContext.jsx
      hooks/
        useChannels.js
        useMessages.js
      pages/
        ChatPage.jsx
        LoginPage.jsx
        RegisterPage.jsx
      App.jsx
      main.jsx
      index.css
    .env.example
    package.json
    vite.config.js

  server/
    src/
      middleware/
        auth.js
        rbac.js
        upload.js
      models/
        Channel.js
        Membership.js
        Message.js
        Story.js
        User.js
      routes/
        ai.js
        auth.js
        channels.js
        messages.js
        stories.js
        uploads.js
        users.js
      socket/
        index.js
      utils/
        db.js
        jwt.js
        origins.js
        seedBot.js
      app.js
    uploads/
      attachments/
    .env.example
    package.json
    server.js
```

## How The Website Works

### 1. Authentication Flow

1. A new user opens `/register`.
2. The frontend sends username, email, and password to `POST /api/auth/register`.
3. The backend validates the input, hashes the password with bcrypt, stores the user in MongoDB, and returns a JWT.
4. The frontend saves the JWT in `localStorage`.
5. For login, the frontend sends email and password to `POST /api/auth/login`.
6. The backend compares the entered password with the hashed password and returns a JWT if it matches.
7. Protected pages call `GET /api/auth/me` to restore the logged-in user.

### 2. Chat Flow

1. After login, the user enters the protected chat page.
2. The frontend fetches the user's channels from `GET /api/channels`.
3. The Socket.io client connects to the backend using the JWT.
4. The server verifies the JWT and joins the user to their channel rooms.
5. When a user sends a message, the frontend emits `send:message`.
6. The backend stores the message in MongoDB and broadcasts `message:new` to everyone in that channel.
7. Other users receive the message instantly without refreshing the page.

### 3. Channel And Role Flow

1. A user can create a group channel.
2. The creator becomes the owner.
3. Owners/admins can add members.
4. Owners can update roles.
5. Role checks protect sensitive operations such as editing channels, removing members, and deleting channels.

### 4. AI Flow

1. Smart replies use recent conversation context to suggest replies.
2. Summaries collect recent messages from a channel and generate a short summary.
3. Semantic search helps find relevant messages based on a natural-language query.
4. The `@ai-assistant` mention triggers the bot flow through Socket.io and posts an AI-generated response into the channel.

### 5. Upload Flow

1. The user selects an image, file, profile photo, or voice note.
2. The frontend uploads it through the backend upload route.
3. The backend stores the file in `server/uploads/attachments`.
4. Messages store attachment metadata and render the uploaded file from the API server.

## Prerequisites

Install these before running the project:

- Node.js 18 or newer
- npm
- MongoDB, either:
  - Local MongoDB running on your system, or
  - MongoDB Atlas connection string
- Git, if cloning from a repository

## Environment Setup

### 1. Server Environment

Create a server environment file:

```bash
cd server
copy .env.example .env
```

For Git Bash or macOS/Linux:

```bash
cd server
cp .env.example .env
```

Example `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/messaging_platform
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
INTEGRATIONS_API_KEY=your_ai_gateway_key_here
```

If using MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string:

```env
MONGO_URI=mongodb+srv://username:password@cluster-name.mongodb.net/messaging_platform
```

Important for Atlas:

- Add your current IP address in Atlas Network Access.
- Make sure the database username and password are correct.
- If your password contains special characters, URL-encode them.

### 2. Client Environment

Create a client environment file:

```bash
cd client
copy .env.example .env
```

For Git Bash or macOS/Linux:

```bash
cd client
cp .env.example .env
```

Example `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## How To Run Locally

Open two terminals.

### Terminal 1: Start Backend

```bash
cd server
npm install
npm run dev
```

Expected backend output:

```text
MongoDB connected: ...
Server running on port 5000 in development mode
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

Expected health response:

```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Terminal 2: Start Frontend

```bash
cd client
npm install
npm run dev
```

Expected frontend output:

```text
Local: http://localhost:5173/
```

Open the website:

```text
http://localhost:5173
```

## Testing The App Flow

1. Open `http://localhost:5173`.
2. Click **Create one** on the login page.
3. Register a first user.
4. Log out or open another browser/incognito window.
5. Register a second user.
6. Search for the second user and create a direct message.
7. Send messages between users.
8. Create a group channel.
9. Add members to the group.
10. Test typing indicators, read receipts, file upload, voice note, stories, and AI features.

For AI features, `INTEGRATIONS_API_KEY` must be configured in `server/.env`.

## API Overview

| Area | Method And Endpoint | Purpose |
| --- | --- | --- |
| Health | `GET /api/health` | Check server status |
| Auth | `POST /api/auth/register` | Register a user |
| Auth | `POST /api/auth/login` | Login and receive JWT |
| Auth | `POST /api/auth/logout` | Logout current user |
| Auth | `GET /api/auth/me` | Restore logged-in user |
| Users | `PATCH /api/users/me` | Update profile |
| Users | `GET /api/users/search?q=` | Search users |
| Users | `GET /api/users/:id` | Get user profile |
| Users | `POST /api/users/:id/block` | Block user |
| Users | `DELETE /api/users/:id/block` | Unblock user |
| Users | `PATCH /api/users/me/status` | Update online status |
| Channels | `GET /api/channels` | List my channels |
| Channels | `POST /api/channels` | Create group channel |
| Channels | `POST /api/channels/direct` | Create/get direct message channel |
| Channels | `GET /api/channels/:id` | Get channel details |
| Channels | `PATCH /api/channels/:id` | Update channel |
| Channels | `DELETE /api/channels/:id` | Delete channel |
| Channels | `GET /api/channels/:channelId/members` | List members |
| Channels | `POST /api/channels/:channelId/members` | Add member |
| Channels | `PATCH /api/channels/:channelId/members/:userId/role` | Change member role |
| Channels | `DELETE /api/channels/:channelId/members/:userId` | Remove member |
| Channels | `DELETE /api/channels/:channelId/leave` | Leave channel |
| Messages | `GET /api/messages/:channelId` | Get paginated messages |
| Messages | `POST /api/messages/:channelId` | Send message through REST |
| Messages | `PATCH /api/messages/:channelId/:messageId/read` | Mark message as read |
| Messages | `POST /api/messages/:channelId/:messageId/reply` | Reply to message |
| Messages | `PATCH /api/messages/:channelId/:messageId/edit` | Edit message |
| Messages | `DELETE /api/messages/:channelId/:messageId/delete-for-me` | Delete message for current user |
| Uploads | `POST /api/uploads/direct` | Upload file through server |
| AI | `POST /api/ai/smart-replies` | Generate reply suggestions |
| AI | `POST /api/ai/compose` | Compose/improve message |
| AI | `POST /api/ai/summarize` | Summarize recent conversation |
| AI | `POST /api/ai/search` | Search conversation semantically |
| Stories | `GET /api/stories` | List active stories |
| Stories | `POST /api/stories` | Create story/status |
| Stories | `PATCH /api/stories/:id/view` | Mark story as viewed |

## Socket.io Events

### Client To Server

| Event | Payload | Purpose |
| --- | --- | --- |
| `send:message` | `{ channelId, content, attachments }` | Send a real-time message |
| `typing:start` | `{ channelId }` | Start typing indicator |
| `typing:stop` | `{ channelId }` | Stop typing indicator |
| `message:read` | `{ channelId, messageId }` | Mark message as read |
| `channel:join` | `{ channelId }` | Join a channel room |
| `channel:leave` | `{ channelId }` | Leave a channel room |

### Server To Client

| Event | Payload | Purpose |
| --- | --- | --- |
| `message:new` | `Message` | New message broadcast |
| `typing:update` | `{ channelId, userId, username, isTyping }` | Typing status update |
| `message:read_receipt` | `{ channelId, messageId, userId, readAt }` | Read receipt update |
| `presence:update` | `{ userId, status }` | Online/offline update |
| `presence:online_users` | `string[]` | Initial online users list |

## Troubleshooting

### Login is not working

Check the backend first:

```text
http://localhost:5000/api/health
```

If the health endpoint does not open:

- Make sure the backend is running with `npm run dev`.
- Make sure MongoDB is connected.
- Check `server/.env`.
- If using Atlas, whitelist your IP address.

If the backend starts but login says invalid credentials:

- Register a new user first.
- Use the same email and password used during registration.
- Check that the user exists in MongoDB.

### Backend stuck before "MongoDB connected"

This usually means MongoDB is unavailable.

For local MongoDB:

```env
MONGO_URI=mongodb://localhost:27017/messaging_platform
```

Make sure MongoDB service is running.

For MongoDB Atlas:

- Verify the Atlas connection string.
- Add your IP in Network Access.
- Confirm username and password.

### Client cannot call backend

Check `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Restart the Vite server after changing `.env`.

### AI features are not working

Check `server/.env`:

```env
INTEGRATIONS_API_KEY=your_ai_gateway_key_here
```

Restart the backend after changing the key.

### File uploads are not visible

Make sure this folder exists:

```text
server/uploads/attachments
```

Also make sure the backend is running because uploaded files are served from the backend origin.

## Live Hosting Guide

A simple deployment split:

- Frontend: Vercel or Netlify
- Backend: Render, Railway, or Fly.io
- Database: MongoDB Atlas

### Backend Production Env

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster-name.mongodb.net/messaging_platform
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend-domain.com
CLIENT_ORIGINS=https://your-frontend-domain.com
INTEGRATIONS_API_KEY=your_ai_gateway_key_here
```

Backend build/start settings:

```bash
npm install
npm start
```

### Frontend Production Env

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

Frontend build settings:

```bash
npm install
npm run build
```

Build output folder:

```text
dist
```

After deployment:

- Add frontend domain to backend `CLIENT_ORIGINS`.
- Add backend domain to frontend env variables.
- Restart/redeploy both apps after env changes.
- Test `/api/health`.
- Register a fresh user and test login.

## Future Enhancements

- Google OAuth sign-in
- RAG-based enterprise knowledge base
- AI action item extraction
- Meeting notes generator from audio/video
- Enterprise analytics dashboard
- Real-time translation
- AI moderation
- Calendar and task management integration

<!--
Google OAuth is planned for later.

When enabling it:

1. Create a Google OAuth 2.0 Client ID for a Web application.
2. Add JavaScript origins:
   - http://localhost:5173
   - your deployed frontend URL
3. Add these env values:
   - client/.env: VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
   - server/.env: GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
4. Re-enable the commented GoogleAuthButton code in LoginPage.jsx and RegisterPage.jsx.
-->

## Portfolio Keywords

MERN, Socket.io, MongoDB, JWT, AI assistant, semantic search, RBAC, real-time systems, enterprise collaboration, file sharing, responsive UI, full-stack development.

## License

Proprietary - owned by Namratha R. All rights reserved.
