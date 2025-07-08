using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SilkyRoad.API.Models
{
    public class Product
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(0, int.MaxValue)]
        public int StockQuantity { get; set; } = 0;

        [MaxLength(50)]
        public string? Category { get; set; }

        [MaxLength(50)]
        public string? Brand { get; set; }

        [MaxLength(50)]
        public string? Size { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(7);

        // Foreign key
        public int StoreId { get; set; }
        [JsonIgnore]
        public virtual Store Store { get; set; } = null!;

        // Navigation properties
        [JsonIgnore]
        public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
        [JsonIgnore]
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();
    }
} 