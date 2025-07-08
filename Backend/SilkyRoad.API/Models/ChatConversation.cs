using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class ChatConversation
    {
        public int Id { get; set; }

        [Required]
        public string User1Id { get; set; } = string.Empty;
        public virtual ApplicationUser User1 { get; set; } = null!;

        [Required]
        public string User2Id { get; set; } = string.Empty;
        public virtual ApplicationUser User2 { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public string LastMessageContent { get; set; } = string.Empty;

        // Optional: Store ID for store-specific conversations
        public int? StoreId { get; set; }
        public virtual Store? Store { get; set; }

        // Navigation property for messages
        public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    }
} 