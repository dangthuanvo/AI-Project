# Chat Feature Implementation

## Overview
The chat feature enables real-time communication between customers and sellers in the Silky Road e-commerce platform. It provides a modern, responsive chat interface with features like typing indicators, read receipts, and conversation management.

## Features

### Core Functionality
- **Real-time Messaging**: Instant message delivery using SignalR
- **Conversation Management**: Organize chats by user and store
- **Typing Indicators**: Show when someone is typing
- **Read Receipts**: Visual indicators for message read status
- **Unread Message Count**: Badge showing unread messages
- **Message History**: Persistent chat history with pagination
- **Store-specific Chats**: Context-aware conversations for store-related inquiries

### User Interface
- **Modern Chat UI**: Clean, responsive design with Material Design
- **Conversation List**: Sidebar showing all conversations
- **Message Bubbles**: Distinct styling for sent vs received messages
- **Floating Chat Button**: Easy access to chat from store pages
- **Mobile Responsive**: Optimized for mobile devices

## Technical Implementation

### Backend Components

#### Database Models
- **ChatMessage**: Stores individual messages with sender, receiver, content, and metadata
- **ChatConversation**: Groups messages between users, optionally linked to stores
- **ApplicationUser**: Extended with chat relationships

#### API Endpoints
- `GET /api/chat/conversations` - Get user's conversations
- `GET /api/chat/messages/{otherUserId}` - Get messages with specific user
- `POST /api/chat/mark-read` - Mark messages as read
- `GET /api/chat/unread-count` - Get unread message count
- `GET /api/chat/store-customers/{storeId}` - Get customers for a store (sellers only)

#### SignalR Hub
- **ChatHub**: Real-time messaging with methods:
  - `SendMessage`: Send a message to another user
  - `MarkAsRead`: Mark conversation as read
  - `Typing`: Send typing indicators

### Frontend Components

#### Services
- **ChatService**: Manages chat state, SignalR connection, and API calls
- **AuthService**: Extended to handle chat authentication

#### Components
- **ChatComponent**: Main chat interface with conversation list and message area
- **ChatButtonComponent**: Floating action button for quick chat access

#### Features
- **Real-time Updates**: Live message delivery and status updates
- **Auto-scroll**: Messages automatically scroll to bottom
- **Input Validation**: Message length limits and validation
- **Error Handling**: Graceful error handling with user feedback

## Usage

### For Customers
1. Navigate to any store page
2. Click the floating chat button (bottom-right corner)
3. Start a conversation with the seller
4. View conversation history in the main chat interface

### For Sellers
1. Access the main chat interface via navigation
2. View all customer conversations
3. Respond to customer inquiries
4. Manage store-specific conversations

### For Admins
1. Access chat interface to monitor conversations
2. View system-wide chat activity

## Security
- **JWT Authentication**: All chat endpoints require valid authentication
- **Role-based Access**: Different permissions for customers, sellers, and admins
- **User Validation**: Messages can only be sent between valid users
- **Store Ownership**: Sellers can only access conversations for their stores

## Database Schema

### ChatMessage Table
```sql
- Id (Primary Key)
- SenderId (Foreign Key to ApplicationUser)
- ReceiverId (Foreign Key to ApplicationUser)
- Content (Max 1000 characters)
- SentAt (DateTime)
- IsRead (Boolean)
- ReadAt (DateTime, nullable)
- StoreId (Foreign Key to Store, nullable)
```

### ChatConversation Table
```sql
- Id (Primary Key)
- User1Id (Foreign Key to ApplicationUser)
- User2Id (Foreign Key to ApplicationUser)
- CreatedAt (DateTime)
- LastMessageAt (DateTime)
- StoreId (Foreign Key to Store, nullable)
```

## Configuration

### SignalR Configuration
- Hub URL: `https://localhost:7001/hubs/chat`
- Authentication: JWT token-based
- Auto-reconnect: Enabled
- Connection timeout: 10 minutes

### Frontend Configuration
- API Base URL: `https://localhost:7001/api`
- Message length limit: 1000 characters
- Typing indicator timeout: 3 seconds
- Pagination: 50 messages per page

## Future Enhancements
- **File Attachments**: Support for image and document sharing
- **Voice Messages**: Audio message support
- **Group Chats**: Multi-user conversations
- **Chat Notifications**: Push notifications for new messages
- **Message Search**: Search through conversation history
- **Chat Export**: Export conversation history
- **Emoji Support**: Enhanced emoji picker
- **Message Reactions**: Like/react to messages

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check if SignalR hub is running and accessible
2. **Messages Not Sending**: Verify JWT token is valid and not expired
3. **Real-time Updates Not Working**: Check browser console for SignalR errors
4. **Chat Button Not Showing**: Ensure user is authenticated and has correct role

### Debug Information
- Check browser console for detailed error messages
- Verify SignalR connection status in browser network tab
- Check backend logs for API and hub errors
- Ensure database migrations are applied correctly 