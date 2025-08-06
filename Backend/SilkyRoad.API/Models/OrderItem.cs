using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SilkyRoad.API.Models
{
    public class OrderItem
    {
        public int Id { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }

        // The price agreed by offer, if any
        public decimal? OfferedPrice { get; set; }

        [Required]
        [MaxLength(200)]
        public string ProductName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ProductImageUrl { get; set; }

        // Foreign keys
        public int OrderId { get; set; }
        [JsonIgnore]
        public virtual Order Order { get; set; } = null!;

        public int ProductId { get; set; }
        public virtual Product Product { get; set; } = null!;

        // Computed property
        public decimal TotalPrice => Quantity * UnitPrice;
    }
} 