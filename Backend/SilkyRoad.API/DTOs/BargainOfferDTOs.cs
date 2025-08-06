using System;
using SilkyRoad.API.Models;

namespace SilkyRoad.API.DTOs
{
    public class CreateBargainOfferDTO
    {
        public int ProductId { get; set; }
        public decimal OfferedPrice { get; set; }
        public string Note { get; set; }
    }

    public class RespondBargainOfferDTO
    {
        public int OfferId { get; set; }
        public string Action { get; set; } // Accept, Reject, Counter
        public decimal? CounterOfferPrice { get; set; }
    }

    public class BargainOfferDTO
    {
        public int Id { get; set; }
        public string OfferNumber { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string BuyerId { get; set; }
        public string SellerId { get; set; }
        public decimal OfferedPrice { get; set; }
        public string Note { get; set; }
        public string Status { get; set; }
        public decimal? CounterOfferPrice { get; set; }
        public int CounterRounds { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public ApplicationUser Buyer { get; set; }
        public ApplicationUser Seller { get; set; }
        public Store Store { get; set; }
        public Product Product { get; set; }
    }
}
