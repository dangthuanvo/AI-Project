using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SilkyRoad.API.Models
{
    public class Order
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string OrderNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string ShippingAddress { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string CustomerEmail { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? CustomerPhone { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal TotalAmount { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        [MaxLength(100)]
        public string? PayPalOrderId { get; set; }

        [MaxLength(100)]
        public string? PayPalTransactionId { get; set; }

        [MaxLength(100)]
        public string? PayPalPaymentId { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime? ShippedDate { get; set; }
        public DateTime? DeliveredDate { get; set; }

        // Foreign key
        public string UserId { get; set; } = string.Empty;
        [JsonIgnore]
        public virtual ApplicationUser User { get; set; } = null!;

        // Foreign key for applied voucher
        public int? UserVoucherId { get; set; }
        public virtual UserVoucher? UserVoucher { get; set; }

        // Navigation properties
        public virtual ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
} 