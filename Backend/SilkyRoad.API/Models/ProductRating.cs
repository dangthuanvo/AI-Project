using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SilkyRoad.API.Models
{
    public class ProductRating
    {
        public int Id { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(2000)]
        public string? Comment { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);

        // Foreign keys
        public int ProductId { get; set; }
        [JsonIgnore]
        public virtual Product Product { get; set; } = null!;

        public string UserId { get; set; } = string.Empty;
        [JsonIgnore]
        public virtual ApplicationUser User { get; set; } = null!;

        public int OrderId { get; set; }
        [JsonIgnore]
        public virtual Order Order { get; set; } = null!;
    }
} 