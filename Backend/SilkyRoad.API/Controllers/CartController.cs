using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using SilkyRoad.API.DTOs;
using System.Security.Claims;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        
        public CartController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<CartResponse>> GetCart()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var cart = await _context.Carts
                .Include(c => c.Items)
                    .ThenInclude(i => i.Product)
                        .ThenInclude(p => p.Store)
                .Include(c => c.Items)
                    .ThenInclude(i => i.Product)
                        .ThenInclude(p => p.ProductImages)
                .FirstOrDefaultAsync(c => c.UserId == userId);
                
            if (cart == null)
            {
                // Create a new cart for the user
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }
            
            var response = new CartResponse
            {
                Id = cart.Id,
                Items = cart.Items.Select(item => new CartItemResponse
                {
                    Id = item.Id,
                    ProductId = item.ProductId,
                    ProductName = item.Product.Name,
                    ProductImageUrl = item.Product.ProductImages.FirstOrDefault()?.ImageUrl,
                    StoreId = item.Product.StoreId,
                    StoreName = item.Product.Store.Name,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalPrice = item.TotalPrice
                }).ToList(),
                TotalAmount = cart.TotalAmount,
                TotalItems = cart.TotalItems
            };
            
            return Ok(response);
        }

        [HttpPost("items")]
        public async Task<ActionResult<CartItemResponse>> AddItem([FromBody] AddToCartRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            // Get user and check roles
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized();
            
            var userRoles = await _userManager.GetRolesAsync(user);
            
            // Check if user is admin - admins cannot add to cart
            if (userRoles.Contains("Admin"))
                return Forbid("Administrators cannot add products to cart");
            
            // Check if user is seller - sellers cannot add to cart
            if (userRoles.Contains("Seller"))
                return Forbid("Sellers cannot add products to cart");
            
            // Only customers can add to cart
            if (!userRoles.Contains("Customer"))
                return Forbid("Only customers can add products to cart");
            
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            
            // Create cart if it doesn't exist
            if (cart == null)
            {
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }
            
            var product = await _context.Products.Include(p => p.Store).Include(p => p.ProductImages).FirstOrDefaultAsync(p => p.Id == request.ProductId);
            if (product == null || !product.IsActive)
                return BadRequest("Product not found");
            
            // Check if seller is trying to add their own product to cart
            if (userRoles.Contains("Seller") && product.Store.OwnerId == userId)
                return Forbid("Sellers cannot add their own products to cart");
                
            var existing = cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
            if (existing != null)
            {
                existing.Quantity += request.Quantity;
                existing.UnitPrice = product.Price;
            }
            else
            {
                var cartItem = new CartItem
                {
                    ProductId = request.ProductId,
                    Quantity = request.Quantity,
                    UnitPrice = product.Price,
                    CartId = cart.Id
                };
                cart.Items.Add(cartItem);
            }
            
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            // Return the updated cart item
            var updatedItem = cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
            if (updatedItem == null)
                return BadRequest("Failed to add item to cart");
                
            var response = new CartItemResponse
            {
                Id = updatedItem.Id,
                ProductId = updatedItem.ProductId,
                ProductName = product.Name,
                ProductImageUrl = product.ProductImages.FirstOrDefault()?.ImageUrl,
                StoreId = product.StoreId,
                StoreName = product.Store.Name,
                Quantity = updatedItem.Quantity,
                UnitPrice = updatedItem.UnitPrice,
                TotalPrice = updatedItem.TotalPrice
            };
            
            return Ok(response);
        }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateCartItemRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            
            if (cart == null)
            {
                // Create a new cart for the user
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }
            
            var item = cart.Items.FirstOrDefault(i => i.Id == id);
            if (item == null)
                return NotFound();
                
            item.Quantity = request.Quantity;
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> RemoveItem(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            
            if (cart == null)
            {
                // Create a new cart for the user
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }
            
            var item = cart.Items.FirstOrDefault(i => i.Id == id);
            if (item == null)
                return NotFound();
                
            cart.Items.Remove(item);
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete]
        public async Task<IActionResult> ClearCart()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            
            if (cart == null)
            {
                // Create a new cart for the user
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }
            
            cart.Items.Clear();
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
} 