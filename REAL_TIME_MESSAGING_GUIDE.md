# Real-Time Messaging Implementation Guide

## Overview

Your app now has a complete real-time messaging system powered by Supabase Realtime. This provides instant message delivery, typing indicators, and read receipts.

## Architecture

```
Frontend Component
    ↓
RealtimeMessagingService (src/lib/realTimeMessaging.ts)
    ↓
Supabase Realtime (WebSocket Connection)
    ↓
PostgreSQL Database (messages, conversations tables)
```

## Features Implemented

### 1. Real-Time Message Delivery
- Instant message delivery without page refresh
- Messages appear immediately for both sender and receiver
- WebSocket-based for low latency

### 2. Typing Indicators
- See when someone is typing
- Real-time broadcast of typing status
- Automatic timeout after inactivity

### 3. Read Receipts
- Mark messages as read
- Track unread message count
- Real-time updates when messages are read

### 4. Conversation Management
- Automatic conversation creation
- Get or create conversations between users
- Track last message timestamp

## How to Use

### Basic Message Sending

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';

// Get or create conversation
const conversationId = await RealtimeMessagingService.getOrCreateConversation(
  userId1,
  userId2
);

// Send a message
const success = await RealtimeMessagingService.sendMessage(
  conversationId,
  senderId,
  receiverId,
  'Hello there!',
  'text' // or 'image', 'video', 'gift', 'voice'
);
```

### Subscribe to Real-Time Messages

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';
import { useEffect } from 'react';

function ChatComponent({ conversationId }) {
  useEffect(() => {
    // Subscribe to messages
    const unsubscribe = RealtimeMessagingService.subscribeToConversation(
      conversationId,
      (message) => {
        // Handle new message
        console.log('New message:', message);
        setMessages(prev => [...prev, message]);
      },
      (typingIndicator) => {
        // Handle typing indicator
        console.log('Typing:', typingIndicator);
        setIsTyping(typingIndicator.is_typing);
      }
    );

    // Cleanup on unmount
    return () => unsubscribe();
  }, [conversationId]);

  return <div>...</div>;
}
```

### Send Typing Indicators

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';

// User starts typing
const handleTyping = () => {
  RealtimeMessagingService.sendTypingIndicator(
    conversationId,
    userId,
    true
  );
};

// User stops typing
const handleStopTyping = () => {
  RealtimeMessagingService.sendTypingIndicator(
    conversationId,
    userId,
    false
  );
};
```

### Mark Messages as Read

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';

// Mark all messages in conversation as read
const success = await RealtimeMessagingService.markMessagesAsRead(
  conversationId,
  userId
);
```

### Get Conversation History

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';

// Load message history (last 50 messages)
const messages = await RealtimeMessagingService.getConversationMessages(
  conversationId,
  50 // limit
);
```

### Get User Conversations

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';

// Get all conversations for a user
const conversations = await RealtimeMessagingService.getUserConversations(
  userId
);

// Each conversation includes:
// - Other participant's profile
// - Last message
// - Timestamp
```

### Track Unread Messages

```typescript
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';
import { useEffect, useState } from 'react';

function NotificationBadge({ userId }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get initial count
    RealtimeMessagingService.getUnreadCount(userId).then(setUnreadCount);

    // Subscribe to changes
    const unsubscribe = RealtimeMessagingService.subscribeToUnreadCount(
      userId,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return unreadCount > 0 ? <span>{unreadCount}</span> : null;
}
```

## Complete Chat Component Example

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { RealtimeMessagingService } from '@/lib/realTimeMessaging';
import { useAuth } from '@/hooks/useAuth';

interface ChatProps {
  recipientId: string;
  recipientName: string;
}

export const Chat: React.FC<ChatProps> = ({ recipientId, recipientName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize conversation
  useEffect(() => {
    if (!user) return;

    const initConversation = async () => {
      const convId = await RealtimeMessagingService.getOrCreateConversation(
        user.id,
        recipientId
      );

      if (convId) {
        setConversationId(convId);

        // Load message history
        const history = await RealtimeMessagingService.getConversationMessages(convId);
        setMessages(history);

        // Mark messages as read
        await RealtimeMessagingService.markMessagesAsRead(convId, user.id);
      }

      setIsLoading(false);
    };

    initConversation();
  }, [user, recipientId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId || !user) return;

    const unsubscribe = RealtimeMessagingService.subscribeToConversation(
      conversationId,
      (message) => {
        setMessages(prev => [...prev, message]);

        // Mark as read if not from current user
        if (message.sender_id !== user.id) {
          RealtimeMessagingService.markMessagesAsRead(conversationId, user.id);
        }
      },
      (indicator) => {
        if (indicator.user_id !== user.id) {
          setIsTyping(indicator.is_typing);
        }
      }
    );

    return () => unsubscribe();
  }, [conversationId, user]);

  // Handle typing
  const handleTyping = () => {
    if (!conversationId || !user) return;

    RealtimeMessagingService.sendTypingIndicator(conversationId, user.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      RealtimeMessagingService.sendTypingIndicator(conversationId, user.id, false);
    }, 3000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !conversationId || !user) return;

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    RealtimeMessagingService.sendTypingIndicator(conversationId, user.id, false);

    // Send message
    const success = await RealtimeMessagingService.sendMessage(
      conversationId,
      user.id,
      recipientId,
      messageText.trim(),
      'text'
    );

    if (success) {
      setMessageText('');
    }
  };

  if (isLoading) {
    return <div>Loading conversation...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold">{recipientName}</h2>
        {isTyping && <p className="text-sm text-gray-500">typing...</p>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender_id === user?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.sender_id === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p>{message.message_text}</p>
              <span className="text-xs opacity-70">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
```

## Database Schema

The messaging system uses these tables:

### conversations
```sql
- id: uuid (primary key)
- user1_id: uuid (references user_profiles)
- user2_id: uuid (references user_profiles)
- last_message_at: timestamptz
- created_at: timestamptz
```

### messages
```sql
- id: uuid (primary key)
- conversation_id: uuid (references conversations)
- sender_id: uuid (references user_profiles)
- receiver_id: uuid (references user_profiles)
- message_text: text
- message_type: text (text, image, video, gift, voice)
- attachment_url: text (optional)
- is_read: boolean
- created_at: timestamptz
```

## Performance Considerations

### Connection Management
- Only one WebSocket connection per conversation
- Automatic reconnection on disconnect
- Cleanup on component unmount

### Batching
- Typing indicators are debounced (3-second timeout)
- Messages are delivered instantly
- Read receipts batched per conversation

### Optimization Tips
1. Limit message history (50-100 messages)
2. Implement pagination for older messages
3. Unsubscribe when component unmounts
4. Throttle typing indicators

## Security

### Row Level Security (RLS)
All messaging tables have RLS policies that ensure:
- Users can only see their own conversations
- Messages can only be read by participants
- Only authenticated users can send messages

### Authentication
- All operations require valid Supabase session
- JWT tokens verified on every request
- No unauthenticated access to messages

## Testing

### Test Real-Time Features
1. Open app in two browser windows
2. Sign in as different users
3. Start a conversation
4. Send messages - should appear instantly in both windows
5. Type in one window - should show "typing..." in other
6. Close conversation - should stop receiving updates

### Test Offline Behavior
1. Disable network
2. Try sending message
3. Re-enable network
4. Message should be sent automatically

## Troubleshooting

### Messages Not Appearing
- Check browser console for errors
- Verify WebSocket connection in Network tab
- Ensure RLS policies allow read access
- Check Supabase Realtime is enabled

### Typing Indicators Not Working
- Verify broadcast channel is subscribed
- Check setTimeout is clearing correctly
- Ensure user IDs are correct

### High Latency
- Check network connection
- Verify Supabase region proximity
- Consider using Supabase Edge Functions
- Monitor database query performance

## Next Steps

1. **Add Media Messages**: Support images, videos, voice notes
2. **Message Reactions**: Add emoji reactions to messages
3. **Message Editing**: Allow users to edit/delete messages
4. **Push Notifications**: Alert users of new messages when offline
5. **Group Chats**: Extend to support multiple participants

## Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Change Data Capture](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Broadcast Channels](https://supabase.com/docs/guides/realtime/broadcast)

---

Real-time messaging is now fully functional and ready for production use!
