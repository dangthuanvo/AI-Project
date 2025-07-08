using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.DTOs
{
    public class ChatMessageDto
    {
        public int Id { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string SenderAvatar { get; set; } = string.Empty;
        public string ReceiverId { get; set; } = string.Empty;
        public string ReceiverName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
    }

    public class SendMessageRequest
    {
        [Required]
        public string ReceiverId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;
        
        public int? StoreId { get; set; }
    }

    public class ChatConversationDto
    {
        public int Id { get; set; }
        public string User1Id { get; set; } = string.Empty;
        public string User1Name { get; set; } = string.Empty;
        public string User1Avatar { get; set; } = string.Empty;
        public string User2Id { get; set; } = string.Empty;
        public string User2Name { get; set; } = string.Empty;
        public string User2Avatar { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastMessageAt { get; set; }
        public string LastMessageContent { get; set; } = string.Empty;
        public int UnreadCount { get; set; }
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
    }

    public class MarkAsReadRequest
    {
        public int ConversationId { get; set; }
    }

    public class GetConversationMessagesRequest
    {
        public string OtherUserId { get; set; } = string.Empty;
        public int? StoreId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
} 