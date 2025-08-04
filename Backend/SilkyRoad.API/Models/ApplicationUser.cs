using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Address { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime? LastLoginAt { get; set; }
        public bool IsActive { get; set; } = true;

        public string? Color { get; set; } = "#1976d2";

        public string? Avatar { get; set; } // URL or path to avatar image

        public string? Pet { get; set; } // User's pet name or type

        // Navigation properties
        public virtual Store? Store { get; set; }
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
        public virtual Cart Cart { get; set; } = new Cart();
        
        // Chat relationships
        public virtual ICollection<ChatMessage> SentMessages { get; set; } = new List<ChatMessage>();
        public virtual ICollection<ChatMessage> ReceivedMessages { get; set; } = new List<ChatMessage>();
        public virtual ICollection<ChatConversation> ConversationsAsUser1 { get; set; } = new List<ChatConversation>();
        public virtual ICollection<ChatConversation> ConversationsAsUser2 { get; set; } = new List<ChatConversation>();
    }
} 