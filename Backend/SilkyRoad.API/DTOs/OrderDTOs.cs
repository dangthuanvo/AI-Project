using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.DTOs
{
    public class CheckoutRequest
    {
        [Required]
        public string ShippingAddress { get; set; }
        
        [Required]
        public string CustomerPhone { get; set; }
    }

    public class CheckoutResponse
    {
        public List<OrderSummary> Orders { get; set; } = new List<OrderSummary>();
        public decimal TotalAmount { get; set; }
    }

    public class OrderSummary
    {
        public int OrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string StoreName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int ItemCount { get; set; }
    }

    public class UpdateOrderStatusRequest
    {
        [Required]
        public string Status { get; set; }
        public string? TrackingNumber { get; set; }
    }
} 