using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.DTOs
{
    public class CreateStoreRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(500)]
        public string? LogoUrl { get; set; }

        [StringLength(500)]
        public string? BannerUrl { get; set; }

        [StringLength(7)]
        public string PrimaryColor { get; set; } = "#3f51b5";

        [StringLength(7)]
        public string SecondaryColor { get; set; } = "#ff4081";

        [Required]
        [Range(0, int.MaxValue)]
        public int PositionX { get; set; }
    }

    public class UpdateStoreRequest
    {
        [StringLength(100)]
        public string? Name { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(500)]
        public string? LogoUrl { get; set; }

        [StringLength(500)]
        public string? BannerUrl { get; set; }

        [StringLength(7)]
        public string? PrimaryColor { get; set; }

        [StringLength(7)]
        public string? SecondaryColor { get; set; }

        [Range(0, int.MaxValue)]
        public int? PositionX { get; set; }

        public bool? IsActive { get; set; }
    }

    public class StoreResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string PrimaryColor { get; set; } = string.Empty;
        public string SecondaryColor { get; set; } = string.Empty;
        public int PositionX { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string OwnerId { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
        public int ProductCount { get; set; }
    }

    public class VirtualStreetResponse
    {
        public List<StoreResponse> Stores { get; set; } = new List<StoreResponse>();
        public int TotalStores { get; set; }
    }
} 