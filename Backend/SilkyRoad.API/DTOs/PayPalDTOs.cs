using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.DTOs
{
    public class CreateOrderRequest
    {
        public int? UserVoucherId { get; set; }
        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }
        
        [Required]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        public string Address { get; set; } = string.Empty;
    }

    public class PayPalOrderResponse
    {
        public string OrderId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class CaptureOrderRequest
    {
        [Required]
        public string OrderId { get; set; } = string.Empty;
    }

    public class PayPalCaptureResponse
    {
        public string OrderId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
        public int OrderNumber { get; set; }
        public int OrderCount { get; set; }
    }

    public class PayPalOrderDetails
    {
        public string OrderId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Amount { get; set; }
        public string? Currency { get; set; }
    }
} 