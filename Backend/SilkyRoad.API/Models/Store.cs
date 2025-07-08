using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class Store
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? BannerUrl { get; set; }

        [MaxLength(7)] // Hex color code
        public string PrimaryColor { get; set; } = "#3f51b5";

        [MaxLength(7)] // Hex color code
        public string SecondaryColor { get; set; } = "#ff4081";

        // Position on the virtual street (horizontal scroll)
        public int PositionX { get; set; } = 0;

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(7);

        // Foreign key
        public string OwnerId { get; set; } = string.Empty;
        public virtual ApplicationUser Owner { get; set; } = null!;

        // Navigation properties
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
} 