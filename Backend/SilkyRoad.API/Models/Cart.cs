using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class Cart
    {
        public int Id { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(7);

        // Foreign key
        public string UserId { get; set; } = string.Empty;
        public virtual ApplicationUser User { get; set; } = null!;

        // Navigation properties
        public virtual ICollection<CartItem> Items { get; set; } = new List<CartItem>();

        // Computed properties
        public decimal TotalAmount => Items.Sum(item => item.TotalPrice);
        public int TotalItems => Items.Sum(item => item.Quantity);
    }
} 