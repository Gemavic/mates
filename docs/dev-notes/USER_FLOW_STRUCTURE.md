# User Flow Structure - Based on Flowchart

This document describes the reorganized user flow of the dating app, following the flowchart design.

## Flow Overview

The app now follows a logical user journey from signup through discovery to messaging:

```
Signup → Profile Setup → Browse/Discover → View Profiles → Messages → Profile Management → Filters
```

---

## 1. Authentication Flow

### Entry Points
- **Sign Up** - New users create an account
  - Email/Password registration
  - Google OAuth
  - Facebook OAuth
  - Apple OAuth
- **Sign In** - Existing users log in
  - Email/Password
  - Social OAuth providers

### OAuth Flow
When users sign in with Google/Facebook/Apple:
1. Click social provider button
2. Redirect to provider for authentication
3. Return to app at `/#auth-callback`
4. Profile automatically created with OAuth metadata
5. Credits initialized
6. Redirect to verification or discovery

---

## 2. Profile Setup (Onboarding)

After signup, new users complete their profile:
- **Personal Information** - Name, age, location
- **Profile Photo** - Upload or use OAuth avatar
- **Bio & Interests** - About me, hobbies
- **Preferences** - What you're looking for

**Flow**: `Signup → Onboarding → Discovery`

---

## 3. Discovery & Browse

Main section where users discover matches:

### Browse All Profiles
- **Discovery Home** (`/#discovery`)
- View all available profiles
- Swipe interface for quick browsing
- Filter options available

### Browse Options
- **All Profiles** - Everyone on the platform
- **Online Now** - Currently active users
- **Following** - Users you follow

### Profile Cards
Each profile shows:
- Profile photo
- Name and age
- Location
- Bio snippet
- Verification status
- Actions: Like, Pass, Message, View Full Profile

---

## 4. Connections

### My Matches (`/#matches`)
- Mutual likes
- Users you've matched with
- Quick message access
- Match history

### Likes (`/#likes`)
- Who liked your profile
- Your sent likes
- Like analytics

---

## 5. Messaging & Communication

### Messages (`/#mail`)
- Private conversations
- Message threads
- Real-time messaging
- Read receipts
- Cost: Credits required for sending messages

### Video Chat (`/#video-chat`)
- Face-to-face video calls
- Screen sharing available
- Premium feature

### Voice Calls (`/#audio-chat`)
- Audio-only conversations
- Lower bandwidth option
- Premium feature

---

## 6. Profile Management

### My Profile (`/#profile`)
- View your own profile as others see it
- Edit profile information
- Upload new photos
- Update bio and interests
- View profile statistics

### View Other Profiles (`/#view-profile`)
- Full profile view of other users
- Swipe through photos
- Read full bio
- See detailed information
- Actions: Like, Message, Report

---

## 7. Filters & Settings

### Settings (`/#settings`)
- Account preferences
- Privacy settings
- Notification settings
- Match filters:
  - Age range
  - Distance
  - Gender
  - Interests
  - Verification status

---

## Navigation Menu Structure

The menu has been reorganized to follow the user flow:

### 1. Get Started / Hi, [Name]!
**Not Logged In:**
- Sign Up - Create your profile
- Sign In - Access your account

**Logged In:**
- My Profile - View & edit your profile
- Settings - Preferences & privacy
- Logout - Sign out of your account

### 2. Discover Matches
- Browse All - Discover perfect matches
- My Matches - Your mutual connections
- Likes - Who likes you

### 3. Messages & Calls
- Messages - Private conversations
- Video Chat - Face-to-face calls
- Voice Call - Audio conversations

### 4. Premium Features
- Buy Credits - Unlock premium features
- Gift Shop - Send special gifts
- VIP Matching - Elite matchmaking service

### 5. Dating Advice & Fun
- Dating Blog - Tips & relationship advice
- Quizzes - Fun personality quizzes
- Date Ideas - Creative date inspiration
- Help & FAQs - Expert guidance

### 6. Support & Services
- Relationship Services - Counselling & therapy
- Verification - Get verified
- Feedback - Share your thoughts

### 7. Legal & Safety
- Terms of Service
- Privacy Policy
- Safety Guidelines

---

## User Journey Examples

### New User Journey
1. Land on Welcome page
2. Click "Sign Up"
3. Choose email/password or OAuth
4. Complete onboarding (profile setup)
5. Redirected to Discovery
6. Browse profiles
7. Like profiles
8. Get matches
9. Start messaging

### Returning User Journey
1. Land on Welcome page
2. Click "Sign In"
3. Enter credentials or use OAuth
4. Redirected to Discovery
5. Check new matches
6. Check messages
7. Browse new profiles
8. Continue conversations

### OAuth User Journey
1. Land on Welcome/SignIn/SignUp
2. Click Google/Facebook/Apple
3. Authenticate with provider
4. Redirect to auth-callback
5. Profile auto-created with OAuth data
6. Credits initialized
7. Redirected to verification or discovery
8. Start browsing

---

## Key Features

### Authentication
- Email/Password signup and login
- Google OAuth
- Facebook OAuth
- Apple OAuth
- Automatic profile creation for OAuth users
- Session management
- Secure password handling

### Profile Management
- Profile photo upload
- Bio and interests
- Location-based matching
- Verification system
- Profile visibility controls

### Discovery
- Swipe-based browsing
- Advanced filtering
- Online status
- Following system
- Profile recommendations

### Communication
- Private messaging (credit-based)
- Real-time video chat
- Voice calls
- Message history
- Read receipts

### Premium Features
- Credit system
- Virtual gifts
- VIP matchmaking
- Profile boosting
- Advanced filters

### Safety & Support
- Profile verification
- Content moderation
- Report system
- Block users
- Privacy controls

---

## Route Structure

### Public Routes
- `/#welcome` - Landing page
- `/#signin` - Sign in page
- `/#signup` - Sign up page
- `/#auth-callback` - OAuth callback handler
- `/#terms` - Terms of service
- `/#privacy` - Privacy policy
- `/#help` - Help center

### Protected Routes (Require Authentication)
- `/#onboarding` - Profile setup
- `/#discovery` - Browse profiles
- `/#matches` - My matches
- `/#likes` - Likes
- `/#mail` - Messages
- `/#profile` - My profile
- `/#view-profile` - View other profile
- `/#settings` - Account settings
- `/#verification` - Get verified
- `/#credits` - Buy credits
- `/#gift-shop` - Send gifts
- `/#video-chat` - Video calls
- `/#audio-chat` - Voice calls
- `/#match-suitor` - VIP matching

### Special Routes
- `/#staff-login` - Staff authentication
- `/#staff-panel` - Staff dashboard
- `/#monitoring` - System monitoring

---

## State Management

### User State
- Authentication status
- Profile data
- Credit balance
- Match count
- Message count
- Online status

### Navigation State
- Current screen
- Previous screen (for back navigation)
- Selected profile (for viewing)
- Chat state (active conversation)

### App State
- Loading states
- Error states
- Transition animations
- Toast notifications

---

## Credits System Flow

### Earning Credits
- Sign up bonus: 10 free credits
- Daily login: 2 credits
- Profile completion: 5 credits
- Verification: 20 credits
- Purchase packages

### Spending Credits
- Send message: 1 credit
- Send gift: 2-10 credits
- Boost profile: 5 credits
- See who liked you: 3 credits
- VIP matching: 50 credits

---

## Technical Implementation

### Routing
- Hash-based routing (`/#screen-name`)
- Browser history API integration
- State persistence
- Deep linking support

### Components
- Modular screen components
- Reusable UI components
- Layout components
- Menu navigation
- Error boundaries

### Data Flow
- Supabase authentication
- Real-time database sync
- Credit transaction logging
- Message delivery tracking
- Profile view analytics

---

## Future Enhancements

Based on the flowchart structure, potential additions:

1. **Advanced Filters**
   - More detailed preference filters
   - Save filter presets
   - Smart match suggestions

2. **Social Features**
   - Profile sharing
   - Friend referrals
   - Group events
   - Community forums

3. **Enhanced Communication**
   - Voice messages
   - Photo/video sharing
   - Stickers and emojis
   - Translation features

4. **Gamification**
   - Achievement badges
   - Streak tracking
   - Leaderboards
   - Daily challenges

---

## Summary

The app flow has been reorganized to follow a logical user journey:

1. **Start** - Sign up with email or OAuth
2. **Setup** - Complete profile onboarding
3. **Discover** - Browse all profiles with filters
4. **Connect** - Match and message
5. **Engage** - Video/voice calls, gifts
6. **Manage** - Profile and settings

This structure ensures users have a clear path from signup to finding matches and building connections!
