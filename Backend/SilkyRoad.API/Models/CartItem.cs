using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class CartItem
    {
        public int Id { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } = 1;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow.AddHours(7);

        // Foreign keys
        public int CartId { get; set; }
        public virtual Cart Cart { get; set; } = null!;

        public int ProductId { get; set; }
        public virtual Product Product { get; set; } = null!;

        // Computed property
        public decimal TotalPrice => Quantity * UnitPrice;
    }
} 