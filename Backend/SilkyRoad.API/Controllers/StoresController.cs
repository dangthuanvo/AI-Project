using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.DTOs;
using SilkyRoad.API.Models;
using System.Security.Claims;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StoresController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StoresController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("virtual-street")]
        public async Task<ActionResult<VirtualStreetResponse>> GetVirtualStreet()
        {
            var stores = await _context.Stores
                .Include(s => s.Owner)
                .Include(s => s.Products)
                .Where(s => s.IsActive)
                .OrderBy(s => s.PositionX)
                .Select(s => new StoreResponse
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    LogoUrl = s.LogoUrl,
                    BannerUrl = s.BannerUrl,
                    PrimaryColor = s.PrimaryColor,
                    SecondaryColor = s.SecondaryColor,
                    PositionX = s.PositionX,
                    IsActive = s.IsActive,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt,
                    OwnerId = s.OwnerId,
                    OwnerName = $"{s.Owner.FirstName} {s.Owner.LastName}",
                    ProductCount = s.Products.Count(p => p.IsActive)
                })
                .ToListAsync();

            return Ok(new VirtualStreetResponse
            {
                Stores = stores,
                TotalStores = stores.Count
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<StoreResponse>> GetStore(int id)
        {
            var store = await _context.Stores
                .Include(s => s.Owner)
                .Include(s => s.Products.Where(p => p.IsActive))
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive);

            if (store == null)
            {
                return NotFound();
            }

            var response = new StoreResponse
            {
                Id = store.Id,
                Name = store.Name,
                Description = store.Description,
                LogoUrl = store.LogoUrl,
                BannerUrl = store.BannerUrl,
                PrimaryColor = store.PrimaryColor,
                SecondaryColor = store.SecondaryColor,
                PositionX = store.PositionX,
                IsActive = store.IsActive,
                CreatedAt = store.CreatedAt,
                UpdatedAt = store.UpdatedAt,
                OwnerId = store.OwnerId,
                OwnerName = $"{store.Owner.FirstName} {store.Owner.LastName}",
                ProductCount = store.Products.Count
            };

            return Ok(response);
        }

        [HttpGet("{storeId}/products")]
        public async Task<ActionResult<List<object>>> GetStoreProducts(int storeId)
        {
            var products = await _context.Products
                .Where(p => p.StoreId == storeId && p.IsActive)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.StockQuantity,
                    p.Category,
                    p.Brand,
                    p.Size,
                    p.Color,
                    ImageUrls = p.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                    p.IsActive,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .ToListAsync();

            return Ok(products);
        }

        [Authorize(Roles = "Seller")]
        [HttpPost]
        public async Task<ActionResult<StoreResponse>> CreateStore(CreateStoreRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            // Check if user already has a store
            var existingStore = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (existingStore != null)
            {
                return BadRequest("User already has a store");
            }

            var store = new Store
            {
                Name = request.Name,
                Description = request.Description,
                LogoUrl = request.LogoUrl,
                BannerUrl = request.BannerUrl,
                PrimaryColor = request.PrimaryColor,
                SecondaryColor = request.SecondaryColor,
                PositionX = request.PositionX,
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Stores.Add(store);
            await _context.SaveChangesAsync();

            var response = new StoreResponse
            {
                Id = store.Id,
                Name = store.Name,
                Description = store.Description,
                LogoUrl = store.LogoUrl,
                BannerUrl = store.BannerUrl,
                PrimaryColor = store.PrimaryColor,
                SecondaryColor = store.SecondaryColor,
                PositionX = store.PositionX,
                IsActive = store.IsActive,
                CreatedAt = store.CreatedAt,
                UpdatedAt = store.UpdatedAt,
                OwnerId = store.OwnerId,
                OwnerName = "", // Will be populated when retrieved
                ProductCount = 0
            };

            return CreatedAtAction(nameof(GetStore), new { id = store.Id }, response);
        }

        [Authorize(Roles = "Seller")]
        [HttpGet("my-store")]
        public async Task<ActionResult<StoreResponse>> GetMyStore()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var store = await _context.Stores
                .Include(s => s.Owner)
                .Include(s => s.Products.Where(p => p.IsActive))
                .FirstOrDefaultAsync(s => s.OwnerId == userId);

            if (store == null)
            {
                return NotFound("Store not found");
            }

            var response = new StoreResponse
            {
                Id = store.Id,
                Name = store.Name,
                Description = store.Description,
                LogoUrl = store.LogoUrl,
                BannerUrl = store.BannerUrl,
                PrimaryColor = store.PrimaryColor,
                SecondaryColor = store.SecondaryColor,
                PositionX = store.PositionX,
                IsActive = store.IsActive,
                CreatedAt = store.CreatedAt,
                UpdatedAt = store.UpdatedAt,
                OwnerId = store.OwnerId,
                OwnerName = $"{store.Owner.FirstName} {store.Owner.LastName}",
                ProductCount = store.Products.Count
            };

            return Ok(response);
        }

        [Authorize(Roles = "Seller")]
        [HttpGet("{storeId}/orders")]
        public async Task<ActionResult<List<object>>> GetStoreOrders(int storeId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            // Verify the store belongs to the current user
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId && s.OwnerId == userId);
            if (store == null)
            {
                return NotFound("Store not found or access denied");
            }

            var orders = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .Where(o => o.Items.Any(oi => oi.Product.StoreId == storeId))
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.CustomerName,
                    o.CustomerEmail,
                    o.TotalAmount,
                    o.Status,
                    o.OrderDate,
                    Items = o.Items.Where(oi => oi.Product.StoreId == storeId).Select(oi => new
                    {
                        oi.Id,
                        oi.Product.Name,
                        oi.Quantity,
                        oi.UnitPrice
                    }).ToList()
                })
                .ToListAsync();

            return Ok(orders);
        }

        [Authorize(Roles = "Seller")]
        [HttpPut("my-store")]
        public async Task<ActionResult<StoreResponse>> UpdateMyStore(UpdateStoreRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (store == null)
            {
                return NotFound("Store not found");
            }

            // Update store properties
            if (!string.IsNullOrEmpty(request.Name))
                store.Name = request.Name;
            
            if (!string.IsNullOrEmpty(request.Description))
                store.Description = request.Description;
            
            if (!string.IsNullOrEmpty(request.LogoUrl))
                store.LogoUrl = request.LogoUrl;
            
            if (!string.IsNullOrEmpty(request.BannerUrl))
                store.BannerUrl = request.BannerUrl;
            
            if (!string.IsNullOrEmpty(request.PrimaryColor))
                store.PrimaryColor = request.PrimaryColor; // Roof color
            else
                store.PrimaryColor = "#000000"; // Default black for roof
            
            if (!string.IsNullOrEmpty(request.SecondaryColor))
                store.SecondaryColor = request.SecondaryColor; // Wall color
            else
                store.SecondaryColor = "#FFFFFF"; // Default white for walls
            
            if (request.PositionX.HasValue)
                store.PositionX = request.PositionX.Value;
            
            store.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Return updated store response
            var response = new StoreResponse
            {
                Id = store.Id,
                Name = store.Name,
                Description = store.Description,
                LogoUrl = store.LogoUrl,
                BannerUrl = store.BannerUrl,
                PrimaryColor = store.PrimaryColor,
                SecondaryColor = store.SecondaryColor,
                PositionX = store.PositionX,
                IsActive = store.IsActive,
                CreatedAt = store.CreatedAt,
                UpdatedAt = store.UpdatedAt,
                OwnerId = store.OwnerId,
                OwnerName = "", // Will be populated when retrieved
                ProductCount = 0
            };

            return Ok(response);
        }
    }
} 