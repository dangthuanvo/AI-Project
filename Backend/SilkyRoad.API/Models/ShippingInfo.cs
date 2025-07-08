using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class ShippingInfo
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        [Required]
        public string Email { get; set; } = string.Empty;
        [Required]
        public string Phone { get; set; } = string.Empty;
        [Required]
        public string Address { get; set; } = string.Empty;
        [Required]
        public string City { get; set; } = string.Empty;
        [Required]
        public string State { get; set; } = string.Empty;
        [Required]
        public string ZipCode { get; set; } = string.Empty;
        [Required]
        public string Country { get; set; } = string.Empty;
    }
} 