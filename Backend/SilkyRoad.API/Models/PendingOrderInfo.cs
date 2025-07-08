using System;
using System.ComponentModel.DataAnnotations;

namespace SilkyRoad.API.Models
{
    public class PendingOrderInfo
    {
        [Key]
        public int Id { get; set; }
        public string PayPalOrderId { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string UserId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
} 