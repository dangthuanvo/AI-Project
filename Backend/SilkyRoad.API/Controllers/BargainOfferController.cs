using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.DTOs;
using SilkyRoad.API.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SilkyRoad.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BargainOfferController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public BargainOfferController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateOffer([FromBody] CreateBargainOfferDTO dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product == null) return NotFound("Product not found");
            if (product.StoreId == null) return BadRequest("Product has no seller");
            var seller = await _context.Stores.Where(s => s.Id == product.StoreId).Select(s => s.OwnerId).FirstOrDefaultAsync();
            if (seller == null) return BadRequest("Seller not found");
            if (userId == seller) return BadRequest("Cannot make offer on your own product");

            var offer = new BargainOffer
            {
                ProductId = dto.ProductId,
                BuyerId = userId,
                SellerId = seller,
                OfferedPrice = dto.OfferedPrice,
                Note = dto.Note,
                Status = BargainOfferStatus.Pending,
                
                CounterRounds = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.BargainOffers.Add(offer);
            await _context.SaveChangesAsync();
            // Generate OfferNumber like 'OFFER202508060001'
            offer.OfferNumber = $"OFFER-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
            await _context.SaveChangesAsync();
            return Ok(new { offer.Id, offer.OfferNumber });
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyOffers()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var offers = await _context.BargainOffers
                .Include(o => o.Product)
                .Include(o => o.Buyer)
                .Include(o => o.Seller)
                .Where(o => o.BuyerId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new BargainOfferDTO
                {
                    Id = o.Id,
                    ProductId = o.ProductId,
                    BuyerId = o.BuyerId,
                    SellerId = o.SellerId,
                    OfferedPrice = o.OfferedPrice,
                    Note = o.Note,
                    Status = o.Status.ToString(),
                    CounterOfferPrice = o.CounterOfferPrice,
                    CounterRounds = o.CounterRounds,
                    CreatedAt = o.CreatedAt,
                    UpdatedAt = o.UpdatedAt,
                    ExpiresAt = o.ExpiresAt,
                    OfferNumber = o.OfferNumber,
                    Buyer = o.Buyer,
                    Seller = o.Seller,
                    Product = o.Product,
                    ProductImageUrl = o.Product.ProductImages.Select(pi => pi.ImageUrl).FirstOrDefault(),
                })
                .ToListAsync();
                foreach (var offer in offers)
                {
                    offer.Store = _context.Stores
                        .Include(s => s.Owner)
                        .Where(s => s.OwnerId == offer.SellerId)
                        .Select(s => new Store
                        {
                            Name = s.Name,
                            LogoUrl = s.LogoUrl,
                            
                        })
                        .FirstOrDefault();
                }
            return Ok(offers);
        }

        [HttpGet("for-product/{productId}")]
        public async Task<IActionResult> GetOffersForProduct(int productId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return NotFound("Product not found");
            var store = await _context.Stores.FindAsync(product.StoreId);
            if (store == null || store.OwnerId != userId) return Forbid();
            var offers = await _context.BargainOffers
                .Where(o => o.ProductId == productId)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new BargainOfferDTO
                {
                    Id = o.Id,
                    ProductId = o.ProductId,
                    BuyerId = o.BuyerId,
                    SellerId = o.SellerId,
                    OfferedPrice = o.OfferedPrice,
                    Note = o.Note,
                    Status = o.Status.ToString(),
                    CounterOfferPrice = o.CounterOfferPrice,
                    CounterRounds = o.CounterRounds,
                    CreatedAt = o.CreatedAt,
                    UpdatedAt = o.UpdatedAt,
                    ExpiresAt = o.ExpiresAt,
                    OfferNumber = o.OfferNumber
                    
                })
                .ToListAsync();
            return Ok(offers);
        }

        [HttpPost("respond")]
        public async Task<IActionResult> RespondToOffer([FromBody] RespondBargainOfferDTO dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var offer = await _context.BargainOffers.FindAsync(dto.OfferId);
            if (offer == null) return NotFound("Offer not found");
            // Only allow seller or buyer to respond depending on action
            var isSeller = offer.SellerId == userId;
            var isBuyer = offer.BuyerId == userId;

            var action = dto.Action?.ToLower();
            // if (action == "accept" || action == "counter_by_customer" || action == "reject_by_customer") {
            //     if (!isBuyer) return Forbid();
            // } else {
            //     if (!isSeller) return Forbid();
            // }

            // Only allow response if offer is Pending, CounteredBySeller, or CounteredByCustomer
            if (offer.Status != BargainOfferStatus.Pending && offer.Status != BargainOfferStatus.CounteredBySeller && offer.Status != BargainOfferStatus.CounteredByCustomer)
                return BadRequest("Cannot respond to an offer that is not pending or countered");

            switch (dto.Action?.ToLower())
            {
                case "accept_by_customer":
                    offer.Status = BargainOfferStatus.AcceptedByCustomer;
                    break;
                case "accept_by_seller":
                    offer.Status = BargainOfferStatus.AcceptedBySeller;
                    break;
                case "reject_by_seller":
                    offer.Status = BargainOfferStatus.RejectedBySeller;
                    break;
                case "reject_by_customer":
                    offer.Status = BargainOfferStatus.RejectedByCustomer;
                    break;
                case "counter_by_seller":
                    if (offer.CounterRounds >= 3)
                        return BadRequest("Counter-offer limit reached");
                    if (!dto.CounterOfferPrice.HasValue)
                        return BadRequest("Counter offer price required");
                    offer.Status = BargainOfferStatus.CounteredBySeller;
                    offer.CounterOfferPrice = dto.CounterOfferPrice;
                    offer.CounterRounds++;
                    break;
                case "counter_by_customer":
                    if (offer.CounterRounds >= 3)
                        return BadRequest("Counter-offer limit reached");
                    if (!dto.CounterOfferPrice.HasValue)
                        return BadRequest("Counter offer price required");
                    offer.Status = BargainOfferStatus.CounteredByCustomer;
                    offer.OfferedPrice = dto.CounterOfferPrice.Value;
                    break;
                case "close":
                    offer.Status = BargainOfferStatus.Closed;
                    break;
                default:
                    return BadRequest("Invalid action");
            }
            offer.UpdatedAt = DateTime.UtcNow.AddHours(7);
            offer.Note = dto.Note;
            await _context.SaveChangesAsync();
            return Ok();
        }
    

    [HttpGet("for-seller")]
    public async Task<IActionResult> GetOffersForSeller()
    {
        var sellerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var offers = await _context.BargainOffers
            .Include(o => o.Product)
            .Include(o => o.Buyer)
            .Include(o => o.Seller)
            .Where(o => o.SellerId == sellerId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new BargainOfferDTO
            {
                Id = o.Id,
                ProductId = o.ProductId,
                BuyerId = o.BuyerId,
                SellerId = o.SellerId,
                OfferedPrice = o.OfferedPrice,
                Note = o.Note,
                Status = o.Status.ToString(),
                CounterOfferPrice = o.CounterOfferPrice,
                CounterRounds = o.CounterRounds,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                ExpiresAt = o.ExpiresAt,
                OfferNumber = o.OfferNumber,
                Buyer = o.Buyer,
                Seller = o.Seller,
                Product = o.Product,
                ProductImageUrl = o.Product.ProductImages.Select(pi => pi.ImageUrl).FirstOrDefault(),
                Store = _context.Stores
                    .Where(s => s.OwnerId == o.SellerId)
                    .Select(s => new Store
                    {
                        Name = s.Name,
                        LogoUrl = s.LogoUrl,
                    })
                    .FirstOrDefault()
            })
            .ToListAsync();
        return Ok(offers);
    }
}
}
