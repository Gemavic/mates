# Dates App - Design & Branding Guide

## Brand Color Palette

### Primary Colors
- **Pink Primary**: `#ec4899` (pink-500)
- **Purple Primary**: `#9333ea` (purple-600)
- **Rose Accent**: `#f43f5e` (rose-500)

### Gradient Combinations
```css
/* Main Brand Gradient */
from-pink-500 via-rose-500 to-purple-600

/* Button Gradient */
from-pink-500 to-purple-600

/* Hover State */
from-pink-600 to-purple-700

/* Light Backgrounds */
from-purple-100 to-pink-100
```

## Component Styling Standards

### Buttons
All primary buttons use the brand gradient with smooth transitions:
- Default: `from-pink-500 to-purple-600`
- Hover: `from-pink-600 to-purple-700` with `scale-105`
- Active: `scale-95`
- Focus ring: `ring-pink-500`

### Footer
Comprehensive navigation with:
- All key pages (About, Contact, Blog, Privacy, Terms, Disclaimer)
- Social media links (Facebook, Twitter, Instagram, LinkedIn)
- Support contact information
- Brand-consistent hover states (`hover:text-pink-600`)
- Mobile and desktop responsive layouts

### Headers
Consistent gradient background:
- `from-pink-500 via-rose-500 to-purple-600`
- White text for maximum contrast
- Subtle overlay effects with `bg-white/10`

### Social Media
All social icons use circular buttons with brand gradient:
- `bg-gradient-to-r from-pink-500 to-purple-600`
- Hover: `from-pink-600 to-purple-700`
- Scale animation on hover: `hover:scale-110`

## Typography

### Font Family
- Primary: System font stack with fallbacks
- Headers: Bold weight (700)
- Body: Regular weight (400)
- Emphasis: Medium weight (500)

### Text Colors
- On brand backgrounds: White (`text-white`)
- On light backgrounds: Gray-700 to Gray-800
- Links: Pink-600 with Pink-700 on hover
- Accent text: Pink-600 or Purple-600

## Layout Standards

### Spacing
- Consistent padding: `px-3 sm:px-4 md:px-6`
- Section gaps: `space-y-4` to `space-y-6`
- Grid gaps: `gap-3 sm:gap-4`

### Responsive Breakpoints
- Mobile: Default (< 640px)
- Tablet: `sm:` (≥ 640px)
- Desktop: `lg:` (≥ 1024px)

### Shadows
- Standard: `shadow-lg`
- Elevated: `shadow-xl`
- Maximum: `shadow-2xl`

## Interactive Elements

### Hover States
- Scale up: `hover:scale-105` or `hover:scale-110`
- Brightness increase: `hover:from-pink-600`
- Background change: `hover:bg-pink-50`

### Active States
- Scale down: `active:scale-95`
- Slightly darker colors

### Transitions
- Standard: `transition-all duration-300`
- Quick: `transition-colors duration-200`

## Accessibility

### Contrast Ratios
- White text on pink/purple gradients: ≥ 4.5:1 (WCAG AA)
- Gray-700 on white backgrounds: ≥ 7:1 (WCAG AAA)

### Focus States
- Visible focus ring: `focus-visible:ring-2 focus-visible:ring-pink-500`
- Ring offset: `ring-offset-2`

### Touch Targets
- Minimum size: 44x44px (iOS guidelines)
- Touch manipulation: `touch-manipulation`

## Footer Architecture

### Mobile Footer (< 1024px)
1. Navigation tabs (sticky bottom bar)
2. Key page links (2-column grid)
3. Social media icons
4. Support contact button
5. Copyright notice

### Desktop Footer (≥ 1024px)
1. Navigation tabs (sticky bottom bar)
2. Four-column layout:
   - Company (About, Blog, Contact)
   - Legal (Privacy, Terms, Disclaimer, Dispute)
   - Support (Help Center, Feedback, Phone)
   - Connect (Social media + contact card)
3. Bottom bar with copyright and tagline

## Brand Voice

### Messaging
- Tagline: "Made with love for genuine connections"
- Focus: Genuine, secure, AI-powered matching
- Tone: Professional yet warm and inviting

### Visual Identity
- Simple heart logo
- Clean, modern design
- Romantic but not overly decorative
- Trust-building through consistency
