using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SilkyRoad.API.Models
{
    public class UserVoucher
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [ForeignKey("UserId")]
        public ApplicationUser User { get; set; }

        [Required]
        public string Code { get; set; }

        [Required]
        public int DiscountPercent { get; set; }

        [Required]
        public string MinigameId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime? ExpiryDate { get; set; }
        public bool IsUsed { get; set; } = false;
    }
}
