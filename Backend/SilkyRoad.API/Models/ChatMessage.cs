using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }

        [Required]
        public string SenderId { get; set; } = string.Empty;
        public virtual ApplicationUser Sender { get; set; } = null!;

        [Required]
        public string ReceiverId { get; set; } = string.Empty;
        public virtual ApplicationUser Receiver { get; set; } = null!;

        [Required]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }

        // Optional: Store ID for store-specific chats
        public int? StoreId { get; set; }
        public virtual Store? Store { get; set; }
    }
} 