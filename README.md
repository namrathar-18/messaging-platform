# PingLink AI

Owner: Namratha R

PingLink AI is an AI-powered real-time messaging and team collaboration web application built with the MERN stack. It combines direct chat, group channels, file sharing, voice notes, stories/status updates, AI assistance, and role-based collaboration controls in one responsive product experience.

Instead of positioning it as a basic chat clone, PingLink AI can be presented as an enterprise-ready communication platform for teams, classrooms, support agents, and audit/compliance groups.

## Recruiter Pitch

Developed PingLink AI, an AI-powered real-time collaboration platform supporting 100+ concurrent users, direct messaging, group channels, semantic search, AI conversation summaries, smart replies, role-based access control, file sharing, voice notes, stories/status updates, and audio/video call UI.

## Features Added

- Real-time 1:1 direct messaging
- Group channels for team collaboration
- Socket.io-based live message delivery
- Online/offline presence indicators
- Typing indicators
- Read receipts
- JWT login and registration
- Role-based access control with owner, admin, and member roles
- Create, update, delete, join, and leave channel workflows
- Member management for group channels
- User search and direct message creation
- File and image sharing
- Upload previews
- Profile photo support
- Editable user profile
- User blocking and unblock support for direct messages
- Voice note recording and playback
- Audio/video call interface
- Stories/status tray with 24-hour style updates
- AI assistant mentions with `@ai-assistant`
- AI smart reply suggestions
- AI conversation summaries
- AI semantic conversation search
- Responsive desktop and mobile chat layout
- Dark and light theme support
- Modern glass-style UI and branded app assets
- Local upload storage for development
- Production-ready environment examples
- Live hosting checklist for frontend, backend, and database deployment

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time | Socket.io |
| Auth | JWT |
| AI | Gemini gateway integration |
| Uploads | Local server uploads |

## Core Modules

- Authentication: email/password registration, login, logout, and session restore
- Messaging: direct messages, group channels, message history, attachments, and read tracking
- Collaboration: channel roles, member management, presence, typing, and calls UI
- AI Workspace: summaries, smart replies, semantic search, and assistant mentions
- User Experience: profile editing, blocking, stories/status, responsive layout, and themes

## Product Directions

PingLink AI can be positioned for multiple industries:

- Corporate collaboration: team channels, summaries, file sharing, search, and calls
- Customer support: agent collaboration, searchable chat history, AI summaries, suggested responses
- Education: classroom groups, notes sharing, faculty/student communication
- Healthcare: secure team communication, patient discussion groups, appointment coordination
- Audit and compliance: auditor groups, evidence uploads, compliance discussions, risk summaries

## Project Structure

```text
messaging-platform/
  client/                 React + Vite frontend
    src/
      api/                Axios API modules
      components/         Auth, layout, chat, brand, and UI components
      context/            Auth, socket, and theme providers
      pages/              Login, register, and chat pages
  server/                 Express + Socket.io backend
    src/
      middleware/         Auth, RBAC, uploads
      models/             User, Channel, Message, Membership, Story
      routes/             REST API routes
      socket/             Socket.io event handlers
      utils/              DB, JWT, origins, bot seeding
```

## Local Setup

### Server

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Server runs at `http://localhost:5000`.


### Client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Client runs at `http://localhost:5173`.

Required client env:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

<!--
Google OAuth is planned for later.

When you enable it:

1. Create a Google OAuth 2.0 Client ID for a Web application.
2. Add JavaScript origins:
   - http://localhost:5173
   - your deployed frontend URL
3. Add these env values:
   - client/.env: VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
   - server/.env: GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
4. Re-enable the commented GoogleAuthButton code in LoginPage.jsx and RegisterPage.jsx.
-->

## Live Hosting

A simple deployment split:

- Frontend: Vercel or Netlify
- Backend: Render, Railway, or Fly.io
- Database: MongoDB Atlas

### Backend Environment

For Render/Railway/Fly, set:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend-domain.com
CLIENT_ORIGINS=https://your-frontend-domain.com,https://your-preview-domain.vercel.app
INTEGRATIONS_API_KEY=your_ai_gateway_key_here
```

Backend commands:

```bash
cd server
npm install
npm start
```

### Frontend Environment

For Vercel/Netlify, set:

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

Frontend commands:

```bash
cd client
npm install
npm run build
```

Build output directory: `client/dist`.

After deployment, add the deployed frontend URL to the backend `CLIENT_ORIGINS` allowlist.

## API Overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Users | `GET /api/users/search`, `GET /api/users/:id`, `PATCH /api/users/me`, `PATCH /api/users/me/status` |
| Channels | CRUD, direct channel creation, members, roles, leave/delete |
| Messages | Paginated history, send message, read receipts |
| Uploads | Server-side direct file upload |
| AI | Smart replies, summaries, semantic search |
| Stories | Status/story creation and listing |

<!-- Planned later: POST /api/auth/google for Google OAuth sign-in. -->

## Portfolio Keywords

MERN, Socket.io, MongoDB, JWT, AI assistant, semantic search, RAG-ready architecture, RBAC, real-time systems, enterprise collaboration, productivity analytics, file sharing, responsive UI.

## License

Proprietary - owned by Namratha R. All rights reserved.
