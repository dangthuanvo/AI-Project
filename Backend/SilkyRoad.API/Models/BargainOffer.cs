using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SilkyRoad.API.Models
{
    public enum BargainOfferStatus
    {
        Pending,
        AcceptedByCustomer,
        AcceptedBySeller,
        RejectedByCustomer,
        RejectedBySeller,
        CounteredBySeller,
        CounteredByCustomer,
        Closed
    }

    public class BargainOffer
    {
        [Key]
        public int Id { get; set; }

        [MaxLength(50)]
        public string OfferNumber { get; set; } = string.Empty;
        [Required]
        public int ProductId { get; set; }
        [Required]
        public string BuyerId { get; set; }
        [Required]
        public string SellerId { get; set; }
        [Required]
        public decimal OfferedPrice { get; set; }
        public string Note { get; set; }
        [Required]
        public BargainOfferStatus Status { get; set; }
        public decimal? CounterOfferPrice { get; set; }
        public int CounterRounds { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        // Navigation
        [ForeignKey("ProductId")]
        public Product Product { get; set; }
        [ForeignKey("BuyerId")]
        public ApplicationUser Buyer { get; set; }
        [ForeignKey("SellerId")]
        public ApplicationUser Seller { get; set; }
    }
}
