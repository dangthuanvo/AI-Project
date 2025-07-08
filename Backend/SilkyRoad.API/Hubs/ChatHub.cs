using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using SilkyRoad.API.Models;
using SilkyRoad.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace SilkyRoad.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;

        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            Console.WriteLine($"[SignalR] OnConnectedAsync: userId={userId}, connId={Context.ConnectionId}");
            if (!string.IsNullOrEmpty(userId))
            {
                // Add user to their personal group
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
                
                // Add user to store groups if they're a seller
                var user = await _context.Users
                    .Include(u => u.Store)
                    .FirstOrDefaultAsync(u => u.Id == userId);
                
                if (user?.Store != null)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"store_{user.Store.Id}");
                }
            }
            
            await base.OnConnectedAsync();
        }

        public async Task SendMessage(string receiverId, string content, int? storeId = null)
        {
            var senderId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(senderId))
                return;

            // Save message to database
            var message = new ChatMessage
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Content = content,
                StoreId = storeId,
                SentAt = DateTime.UtcNow.AddHours(7)
            };

            _context.ChatMessages.Add(message);

            // Get or create conversation
            var conversation = await GetOrCreateConversation(senderId, receiverId, storeId);
            conversation.LastMessageAt = DateTime.UtcNow.AddHours(7);
            conversation.LastMessageContent = content;

            await _context.SaveChangesAsync();

            // Get sender and receiver info
            var sender = await _context.Users.FindAsync(senderId);
            var receiver = await _context.Users.FindAsync(receiverId);

            // Create message DTO
            var messageDto = new DTOs.ChatMessageDto
            {
                Id = message.Id,
                SenderId = senderId,
                SenderName = $"{sender?.FirstName} {sender?.LastName}",
                SenderAvatar = sender?.Avatar ?? "/uploads/images/user-avatar.png",
                ReceiverId = receiverId,
                ReceiverName = $"{receiver?.FirstName} {receiver?.LastName}",
                Content = content,
                SentAt = message.SentAt,
                IsRead = false,
                StoreId = storeId
            };

            // Send to receiver
            await Clients.Group($"user_{receiverId}").SendAsync("ReceiveMessage", messageDto);
            
            // Send back to sender for confirmation
            await Clients.Caller.SendAsync("MessageSent", messageDto);
        }

        public async Task MarkAsRead(int conversationId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId))
                return;

            // Mark unread messages as read
            var unreadMessages = await _context.ChatMessages
                .Where(m => m.ReceiverId == userId && !m.IsRead && 
                           (m.SenderId == _context.ChatConversations
                               .Where(c => c.Id == conversationId)
                               .Select(c => c.User1Id == userId ? c.User2Id : c.User1Id)
                               .FirstOrDefault()))
                .ToListAsync();

            foreach (var message in unreadMessages)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow.AddHours(7);
            }

            await _context.SaveChangesAsync();

            // Notify sender that messages were read
            var senderId = unreadMessages.FirstOrDefault()?.SenderId;
            if (!string.IsNullOrEmpty(senderId))
            {
                await Clients.Group($"user_{senderId}").SendAsync("MessagesRead", conversationId, userId);
            }
        }

        public async Task Typing(string receiverId, bool isTyping)
        {
            var senderId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(senderId))
            {
                await Clients.Group($"user_{receiverId}").SendAsync("UserTyping", senderId, isTyping);
            }
        }

        private async Task<ChatConversation> GetOrCreateConversation(string user1Id, string user2Id, int? storeId)
        {
            // Ensure consistent ordering of user IDs
            var (firstUserId, secondUserId) = string.Compare(user1Id, user2Id) < 0 
                ? (user1Id, user2Id) 
                : (user2Id, user1Id);

            var conversation = await _context.ChatConversations
                .FirstOrDefaultAsync(c => 
                    (c.User1Id == firstUserId && c.User2Id == secondUserId) ||
                    (c.User1Id == secondUserId && c.User2Id == firstUserId));

            if (conversation == null)
            {
                conversation = new ChatConversation
                {
                    User1Id = firstUserId,
                    User2Id = secondUserId,
                    StoreId = storeId,
                    CreatedAt = DateTime.UtcNow.AddHours(7),
                    LastMessageAt = DateTime.UtcNow.AddHours(7),
                    LastMessageContent = string.Empty
                };
                _context.ChatConversations.Add(conversation);
            }

            return conversation;
        }

        // --- User-to-user chat request logic ---
        public async Task SendChatRequest(string targetUserId, string requesterId, string requesterName)
        {
            Console.WriteLine($"[SignalR] SendChatRequest: {requesterId} -> {targetUserId}");
            // Send a chat request to the target user
            await Clients.Group($"user_{targetUserId}").SendAsync("ReceiveChatRequest", requesterId, requesterName);
        }

        public async Task ChatRequestResponse(string requesterId, bool accepted)
        {
            // Notify the requester of the response
            await Clients.Group($"user_{requesterId}").SendAsync("ChatRequestResponse", Context.UserIdentifier, accepted);
        }
    }
} 