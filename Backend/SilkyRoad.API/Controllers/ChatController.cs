using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.DTOs;
using SilkyRoad.API.Models;
using System.Security.Claims;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ChatController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("conversations")]
        public async Task<ActionResult<List<ChatConversationDto>>> GetConversations()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var conversations = await _context.ChatConversations
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Include(c => c.Store)
                .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
                .Where(c => c.User1Id == userId || c.User2Id == userId)
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            var conversationDtos = new List<ChatConversationDto>();

            foreach (var conversation in conversations)
            {
                var otherUser = conversation.User1Id == userId ? conversation.User2 : conversation.User1;
                var lastMessage = conversation.Messages.FirstOrDefault();
                
                // Get unread count
                var unreadCount = await _context.ChatMessages
                    .CountAsync(m => m.ReceiverId == userId && 
                                   m.SenderId == otherUser.Id && 
                                   !m.IsRead);

                conversationDtos.Add(new ChatConversationDto
                {
                    Id = conversation.Id,
                    User1Id = conversation.User1Id,
                    User1Name = $"{conversation.User1.FirstName} {conversation.User1.LastName}",
                    User1Avatar = conversation.User1.Avatar ?? "/uploads/images/user-avatar.png",
                    User2Id = conversation.User2Id,
                    User2Name = $"{conversation.User2.FirstName} {conversation.User2.LastName}",
                    User2Avatar = conversation.User2.Avatar ?? "/uploads/images/user-avatar.png",
                    CreatedAt = conversation.CreatedAt,
                    LastMessageAt = conversation.LastMessageAt,
                    LastMessageContent = lastMessage?.Content ?? "",
                    UnreadCount = unreadCount,
                    StoreId = conversation.StoreId,
                    StoreName = conversation.Store?.Name
                });
            }

            return Ok(conversationDtos);
        }

        [HttpGet("messages/{otherUserId}")]
        public async Task<ActionResult<List<ChatMessageDto>>> GetMessages(string otherUserId, [FromQuery] int? storeId = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var skip = (page - 1) * pageSize;

            var messages = await _context.ChatMessages
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Include(m => m.Store)
                .Where(m => 
                    ((m.SenderId == userId && m.ReceiverId == otherUserId) ||
                     (m.SenderId == otherUserId && m.ReceiverId == userId)) &&
                    (storeId == null || m.StoreId == storeId))
                .OrderByDescending(m => m.SentAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            var messageDtos = messages.Select(m => new ChatMessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = $"{m.Sender.FirstName} {m.Sender.LastName}",
                SenderAvatar = m.Sender.Avatar ?? "/uploads/images/user-avatar.png",
                ReceiverId = m.ReceiverId,
                ReceiverName = $"{m.Receiver.FirstName} {m.Receiver.LastName}",
                Content = m.Content,
                SentAt = m.SentAt,
                IsRead = m.IsRead,
                ReadAt = m.ReadAt,
                StoreId = m.StoreId,
                StoreName = m.Store?.Name
            }).ToList();

            // Mark messages as read if they're from the other user
            var unreadMessages = messages.Where(m => m.ReceiverId == userId && !m.IsRead).ToList();
            foreach (var message in unreadMessages)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow;
            }

            if (unreadMessages.Any())
            {
                await _context.SaveChangesAsync();
            }

            return Ok(messageDtos);
        }

        [HttpPost("mark-read")]
        public async Task<ActionResult> MarkAsRead([FromBody] MarkAsReadRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var conversation = await _context.ChatConversations
                .FirstOrDefaultAsync(c => c.Id == request.ConversationId && 
                                        (c.User1Id == userId || c.User2Id == userId));

            if (conversation == null)
                return NotFound();

            var otherUserId = conversation.User1Id == userId ? conversation.User2Id : conversation.User1Id;

            var unreadMessages = await _context.ChatMessages
                .Where(m => m.ReceiverId == userId && m.SenderId == otherUserId && !m.IsRead)
                .ToListAsync();

            foreach (var message in unreadMessages)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var count = await _context.ChatMessages
                .CountAsync(m => m.ReceiverId == userId && !m.IsRead);

            return Ok(count);
        }

        [HttpGet("store-customers/{storeId}")]
        [Authorize(Roles = "Seller")]
        public async Task<ActionResult<List<object>>> GetStoreCustomers(int storeId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Verify the user owns this store
            var store = await _context.Stores
                .FirstOrDefaultAsync(s => s.Id == storeId && s.OwnerId == userId);

            if (store == null)
                return NotFound();

            // Get customers who have messaged this store
            var customers = await _context.ChatMessages
                .Where(m => m.StoreId == storeId)
                .Select(m => new { m.SenderId, m.ReceiverId })
                .Distinct()
                .ToListAsync();

            var customerIds = customers
                .SelectMany(c => new[] { c.SenderId, c.ReceiverId })
                .Where(id => id != userId)
                .Distinct()
                .ToList();

            var customerUsers = await _context.Users
                .Where(u => customerIds.Contains(u.Id))
                .Select(u => new
                {
                    u.Id,
                    Name = $"{u.FirstName} {u.LastName}",
                    u.Avatar,
                    u.Email
                })
                .ToListAsync();

            return Ok(customerUsers);
        }

        [HttpPost("conversation/initiate")]
        public async Task<ActionResult<ChatConversationDto>> InitiateConversation([FromBody] InitiateConversationRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Only allow the current user to initiate as user1 or user2
            if (request.UserId1 != userId && request.UserId2 != userId)
                return Forbid();

            var conversation = await _context.ChatConversations
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Include(c => c.Store)
                .FirstOrDefaultAsync(c =>
                    ((c.User1Id == request.UserId1 && c.User2Id == request.UserId2) ||
                     (c.User1Id == request.UserId2 && c.User2Id == request.UserId1)) &&
                    c.StoreId == request.StoreId);

            if (conversation == null)
            {
                conversation = new ChatConversation
                {
                    User1Id = request.UserId1,
                    User2Id = request.UserId2,
                    StoreId = request.StoreId,
                    CreatedAt = DateTime.UtcNow.AddHours(7),
                    LastMessageAt = DateTime.UtcNow.AddHours(7),
                    LastMessageContent = ""
                };
                _context.ChatConversations.Add(conversation);
                await _context.SaveChangesAsync();
                // Reload with includes
                conversation = await _context.ChatConversations
                    .Include(c => c.User1)
                    .Include(c => c.User2)
                    .Include(c => c.Store)
                    .FirstOrDefaultAsync(c => c.Id == conversation.Id);
            }

            var otherUser = conversation.User1Id == userId ? conversation.User2 : conversation.User1;
            var unreadCount = await _context.ChatMessages
                .CountAsync(m => m.ReceiverId == userId && m.SenderId == otherUser.Id && !m.IsRead);

            var dto = new ChatConversationDto
            {
                Id = conversation.Id,
                User1Id = conversation.User1Id,
                User1Name = $"{conversation.User1.FirstName} {conversation.User1.LastName}",
                User1Avatar = conversation.User1.Avatar ?? "/uploads/images/user-avatar.png",
                User2Id = conversation.User2Id,
                User2Name = $"{conversation.User2.FirstName} {conversation.User2.LastName}",
                User2Avatar = conversation.User2.Avatar ?? "/uploads/images/user-avatar.png",
                CreatedAt = conversation.CreatedAt,
                LastMessageAt = conversation.LastMessageAt,
                LastMessageContent = conversation.LastMessageContent,
                UnreadCount = unreadCount,
                StoreId = conversation.StoreId,
                StoreName = conversation.Store?.Name
            };

            return Ok(dto);
        }

        public class InitiateConversationRequest
        {
            public string UserId1 { get; set; }
            public string UserId2 { get; set; }
            public int? StoreId { get; set; }
        }
    }
} 