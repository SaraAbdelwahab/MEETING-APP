# Premium Meeting Room Styling Guide

## Design Philosophy

The MeetingRoomPremium UI is inspired by Google Meet with advanced CSS styling featuring:
- Deep gradient backgrounds with animated shifts
- Glassmorphism panels with blur and transparency
- Smooth shadows, rounded corners, and modern typography
- Production-quality animations and transitions

## Color Palette

### Primary Colors
- **Background**: Deep blue/black gradient (`#0a0e27` → `#1a1f3a` → `#0f1419`)
- **Accent**: Indigo/Purple (`#6366f1` → `#8b5cf6`)
- **Success**: Green (`#10b981`)
- **Warning**: Amber (`#fbbf24`)
- **Danger**: Red (`#ef4444`)

### Glassmorphism
- Background: `rgba(15, 20, 35, 0.95)`
- Backdrop filter: `blur(30px) saturate(180%)`
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- Shadow: `0 -4px 24px rgba(0, 0, 0, 0.4)`

## Key Animations

### 1. Gradient Shift (Background)
```css
animation: gradientShift 15s ease infinite;
```
Subtle background movement creating depth

### 2. Tile Appear
```css
animation: tileAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```
Video tiles fade in and scale up smoothly

### 3. Speaker Pulse
```css
animation: speakerPulse 2s ease-in-out infinite;
```
Active speaker gets glowing green border with pulsing effect

### 4. Message Slide In
```css
animation: messageSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```
Chat messages slide up with fade

### 5. Badge Pop
```css
animation: badgePop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```
Unread badge appears with bounce

### 6. Typing Dot
```css
animation: typingDot 1.4s ease-in-out infinite;
```
Subtle pulsing dot for typing indicator

## Component Styling

### Video Tiles
- **Aspect Ratio**: 16:9 maintained
- **Border**: 2px solid with transparency
- **Hover Effect**: Lift up 4px with enhanced shadow
- **Active Speaker**: Green glow with 4px ring and pulsing shadow
- **Pinned**: Blue border with subtle glow

### Avatar Fallbacks
- **Size**: 140px circle
- **Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Shadow**: Inset and outer shadows for depth
- **Border**: 3px white with 10% opacity
- **Font**: 3.5rem, weight 700, letter-spacing 0.05em

### Control Buttons
- **Shape**: 64px circular buttons
- **Background**: Gradient with glassmorphism
- **Hover**: Lift 4px, scale 1.05, add glow
- **Active State**: Red gradient for muted/off states
- **Leave Button**: Permanent red gradient
- **Ripple Effect**: Expanding circle on hover

### Chat Panel
- **Message Bubbles**: 
  - Own messages: Blue gradient, rounded top-right corner sharp
  - Other messages: Gray gradient, rounded top-left corner sharp
  - Padding: 0.875rem 1.125rem
  - Max width: 85%
  - Shadow: Subtle with blur

- **Input Field**:
  - Border radius: 1.5rem (pill shape)
  - Focus: Blue border with 3px glow ring
  - Padding: 0.875rem 1.25rem

- **Send Button**:
  - Gradient: Indigo to purple
  - Hover: Lift 2px with enhanced shadow
  - Font weight: 700

### Participant Panel
- **List Items**:
  - Hover: Slide right 4px with background
  - Speaking: Green gradient background with pulse
  - Avatar: 44px with 2px border
  - Host badge: Amber gradient with uppercase text

- **Search Input**:
  - Focus: Blue border with glow ring
  - Border radius: 0.75rem

### Connection Badge
- **Connected**: Green gradient with glow
- **Connecting/Reconnecting**: Amber with pulse animation
- **Disconnected**: Red gradient with glow
- **Poor Network**: Orange gradient

## Responsive Breakpoints

### Desktop (> 1200px)
- Right panel: 380px
- Full control labels visible
- Optimal spacing

### Tablet (768px - 1024px)
- Right panel: 320px
- Smaller buttons (56px)
- Reduced padding

### Mobile (< 768px)
- Right panel: Full screen overlay
- Circular buttons only (52px)
- Hidden labels
- Single column grid
- Compact header

### Small Mobile (< 480px)
- Buttons: 48px
- Minimal spacing
- Avatar fallback: 100px

## Scrollbar Styling

Custom scrollbars with glassmorphism:
- Width: 8px
- Track: Transparent with subtle background
- Thumb: Gradient (indigo to purple) with border
- Hover: Enhanced gradient opacity

## Typography

- **Font Family**: 'Inter', system fonts
- **Headings**: Weight 700, gradient text fill
- **Body**: Weight 400-600
- **Monospace**: 'SF Mono', 'Monaco', 'Cascadia Code'
- **Letter Spacing**: -0.02em for headings, 0.1em for uppercase

## Shadows

### Elevation Levels
1. **Low**: `0 2px 8px rgba(0, 0, 0, 0.15)`
2. **Medium**: `0 4px 16px rgba(0, 0, 0, 0.3)`
3. **High**: `0 8px 32px rgba(0, 0, 0, 0.4)`
4. **Glow**: `0 0 32px rgba(99, 102, 241, 0.2)`

## Transitions

All interactive elements use:
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

This creates smooth, natural motion with ease-out timing.

## Accessibility

- **Focus States**: 3px blue ring with offset
- **ARIA Labels**: All interactive elements
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Keyboard Navigation**: Full support with visible focus
- **Color Contrast**: WCAG AA compliant

## Performance Optimizations

- **GPU Acceleration**: `transform` and `opacity` for animations
- **Will-change**: Applied to frequently animated elements
- **Backdrop Filter**: Hardware accelerated blur
- **CSS Grid**: Efficient layout calculations
- **Aspect Ratio**: Native CSS property for video tiles

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires: CSS Grid, backdrop-filter, aspect-ratio

## Production Checklist

✅ Smooth 60fps animations
✅ No layout shifts on participant join/leave
✅ Glassmorphism with proper fallbacks
✅ Responsive across all devices
✅ Accessible keyboard navigation
✅ Reduced motion support
✅ Custom scrollbars
✅ Gradient text effects
✅ Circular button ripples
✅ Active speaker glow
✅ Chat bubble styling
✅ Loading states
✅ Error states
✅ Empty states
