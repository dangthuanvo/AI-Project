using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.DTOs
{
    public class AddToCartRequest
    {
        [Required]
        [Range(1, int.MaxValue)]
        public int ProductId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } = 1;
    }

    public class UpdateCartItemRequest
    {
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class CartItemResponse
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ProductImageUrl { get; set; }
        public int StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
    }

    public class CartResponse
    {
        public int Id { get; set; }
        public List<CartItemResponse> Items { get; set; } = new();
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; }
    }
} 