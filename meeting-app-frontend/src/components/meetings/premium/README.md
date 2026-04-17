# MeetingRoomPremium - Google Meet Inspired UI

A premium, production-ready meeting room interface with a clean 3-zone layout.

## Architecture

### Layout Zones
1. **Center**: Responsive video grid with dynamic participant tiles
2. **Right Panel**: Collapsible panel for chat and participants
3. **Top/Bottom**: Meeting header with status and control bar

### Components

#### MeetingRoomPremium (Main Container)
- Orchestrates all child components
- Manages meeting state, participants, messages
- Handles socket events and WebRTC integration
- Routes: `/meeting/:id` and `/meetings/:id`

#### MeetingHeader
- Displays meeting title and ID
- Shows connection status badge
- Participant count indicator

#### ConnectionBadge
- Visual status indicator with 5 states:
  - Connected (green)
  - Connecting (yellow, pulsing)
  - Reconnecting (yellow, pulsing)
  - Disconnected (red)
  - Poor Network (orange)

#### VideoGrid
- Responsive grid layout adapting to participant count:
  - 1 participant: Large centered tile
  - 2 participants: Side-by-side
  - 3-4 participants: 2x2 grid
  - 5-6 participants: 3x2 grid
  - 7+ participants: Auto-fill grid
- Spotlight area for pinned participants
- Smooth transitions when participants join/leave

#### VideoTile
- Live video display with fallback logic:
  1. Live video (if camera on)
  2. Profile photo
  3. Email avatar (first letter)
  4. Initials (2 letters)
  5. Generated gradient placeholder
- Active speaker highlight with glow animation
- Status badges:
  - Muted microphone
  - Hand raised (with bounce animation)
  - Reconnecting
  - Disconnected
- Pin/unpin button
- Hover overlay with participant info

#### ChatPanel
- Real-time message display
- Message composer with send button
- Typing indicators (3-second timeout)
- System messages support
- Timestamps in 12-hour format
- Unread message badge
- Auto-scroll to latest message
- 500 character limit per message

#### ParticipantPanel
- Searchable participant list
- Sections:
  - Raised Hands (priority display)
  - Current Speaker
  - All Participants
- Participant info:
  - Avatar (photo or initials)
  - Name with "(You)" indicator
  - Host badge
  - Status icons (muted, camera off, speaking, hand raised)
- Active speaker highlight

#### ControlBar
- Microphone toggle (mute/unmute)
- Camera toggle (start/stop video)
- Screen share toggle
- Hand raise toggle
- Chat toggle (with unread badge)
- Participants toggle
- Copy meeting link (with feedback)
- Leave meeting button (red)

## Features

### Video Logic
- `cameraOn` = show live video
- `cameraOff` = show fallback (photo → email → initials → gradient)
- `micMuted` = show muted badge
- `speaking` = active speaker highlight with glow
- `handRaised` = hand badge + bounce animation
- `pinned` = move to spotlight area
- `disconnected/reconnecting` = status overlay

### Chat Features
- Real-time messaging via Socket.IO
- Typing indicators
- System messages
- Unread count badge
- Message timestamps
- Auto-scroll
- Character limit (500)

### Participant Features
- Search functionality
- Active speaker tracking
- Hand raise notifications
- Host identification
- Status indicators
- Raised hands priority display

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus visible states
- Screen reader friendly
- Reduced motion support
- Semantic HTML structure

### Design
- Dark premium gradient background
- Glassmorphism panels (blur + transparency)
- Smooth animations and transitions
- Active speaker glow effect
- Hover states on all buttons
- Responsive design (desktop, tablet, mobile)
- Clean spacing and hierarchy

## Socket Events

### Emitted
- `join-call` - Join meeting
- `leave-call` - Leave meeting
- `chat-message` - Send message
- `typing` - User is typing
- `hand-raise` - Toggle hand raise

### Listened
- `meeting-participants` - Participant list updates
- `chat-message` - Incoming messages
- `hand-raise` - Hand raise state changes
- `active-speaker` - Active speaker changes
- `user-typing` - Typing indicators

## State Management

### Local State
- `meeting` - Meeting details
- `participants` - Participant list
- `messages` - Chat messages
- `activeSpeaker` - Current speaker ID
- `handRaised` - User's hand raise state
- `raisedHands` - Set of user IDs with raised hands
- `rightPanel` - 'chat' | 'participants' | null
- `connectionStatus` - Connection state
- `unreadCount` - Unread message count
- `typingUsers` - Set of typing usernames
- `pinnedUserId` - Pinned participant ID

### Context Usage
- `useAuth()` - User authentication
- `useSocket()` - Socket.IO connection
- `useWebRTC()` - WebRTC streams and controls

## Responsive Breakpoints

- Desktop: > 1024px (full layout)
- Tablet: 768px - 1024px (narrower panel, hidden labels)
- Mobile: < 768px (overlay panel, compact controls)

## Performance

- Efficient re-renders with proper React keys
- Debounced typing indicators (3s timeout)
- Smooth CSS transitions
- Optimized video element rendering
- Lazy panel rendering (only when open)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires WebRTC support
- Requires modern CSS (backdrop-filter, grid)
