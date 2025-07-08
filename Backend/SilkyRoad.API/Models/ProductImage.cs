using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SilkyRoad.API.Models
{
    public class ProductImage
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        [JsonIgnore]
        public virtual Product Product { get; set; } = null!;
        [MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;
    }
} 