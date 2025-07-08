using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.DTOs
{
    public class CreateProductRequest
    {
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

        public List<string>? ImageUrls { get; set; }
    }

    public class UpdateProductRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Price { get; set; }

        [Range(0, int.MaxValue)]
        public int? StockQuantity { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        [MaxLength(50)]
        public string? Brand { get; set; }

        [MaxLength(50)]
        public string? Size { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        public List<string>? ImageUrls { get; set; }

        public bool? IsActive { get; set; }
    }

    public class ProductResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public string? Category { get; set; }
        public string? Brand { get; set; }
        public string? Size { get; set; }
        public string? Color { get; set; }
        public List<string>? ImageUrls { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
    }
} 