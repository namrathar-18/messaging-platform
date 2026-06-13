# TODO - Messaging Platform (Industry-level polish)

## Phase 1: Responsive layout + dark/light across whole app
- [x] Update Chat shell + sidebar behavior for mobile (drawer/overlay)
  - Files: client/src/pages/ChatPage.jsx, client/src/components/layout/Sidebar.jsx, client/src/components/chat/ChatArea.jsx
- [x] Ensure modals/panels use dark mode classes (not only sidebar)
  - Files: client/src/components/chat/CreateChannelModal.jsx, client/src/components/chat/NewDirectMessageModal.jsx

## Phase 2: Create group UX revision
- [x] Improve CreateChannelModal copy + validation UX for group creation
  - Files: client/src/components/chat/CreateChannelModal.jsx
- [x] Rename sidebar section "Channels" -> "Groups" where appropriate
  - Files: client/src/components/layout/Sidebar.jsx

## Phase 3: Google OAuth credential validation at sign-up time
- [x] Inspect existing backend JWT/cookie setup and auth dependencies
- [x] Implement Google OAuth endpoints on backend
- [x] Add frontend "Continue with Google" for login/register

## Phase 4: AI features + premium USP
- [x] Review existing AI backend route(s) and current AI components
- [x] Upgrade AI UX: summaries, conversation search, smart replies with premium styling
- [x] Add USP copy across login/landing/welcome screens

## User-requested WhatsApp-plus features
- [x] Unique modern glassmorphism theme
- [x] Profile panel and editable user profile
- [x] Uploadable profile photos
- [x] Complex chat settings/profile side panel
- [x] Image and file sharing with upload previews
- [x] Voice note recording and playback
- [x] Audio/video call interface
- [x] Stories/status tray with 24-hour expiry
- [x] Block/unblock contacts with DM protection
- [x] AI message enhancement, smart replies, AI search, summaries, and @ai-assistant
