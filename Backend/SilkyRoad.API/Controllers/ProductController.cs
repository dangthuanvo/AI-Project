using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SilkyRoad.API.Models;
using SilkyRoad.API.Services.Interfaces;
using SilkyRoad.API.DTOs;
using System.Security.Claims;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;
        public ProductController(IProductService productService)
        {
            _productService = productService;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProductResponse>> GetProduct(int id)
        {
            var product = await _productService.GetByIdAsync(id);
            if (product == null || !product.IsActive)
                return NotFound();
            
            var response = new ProductResponse
            {
                Id = product.Id,
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                StockQuantity = product.StockQuantity,
                Category = product.Category,
                Brand = product.Brand,
                Size = product.Size,
                Color = product.Color,
                ImageUrls = product.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                IsActive = product.IsActive,
                CreatedAt = product.CreatedAt,
                UpdatedAt = product.UpdatedAt,
                StoreId = product.StoreId,
                StoreName = product.Store?.Name ?? "Unknown Store"
            };
            
            return Ok(response);
        }

        [Authorize(Roles = "Seller")]
        [HttpPost]
        public async Task<ActionResult<ProductResponse>> CreateProduct(CreateProductRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            var product = new Product
            {
                Name = request.Name,
                Description = request.Description,
                Price = request.Price,
                StockQuantity = request.StockQuantity,
                Category = request.Category,
                Brand = request.Brand,
                Size = request.Size,
                Color = request.Color,
                ProductImages = request.ImageUrls?.Select(url => new ProductImage { ImageUrl = url }).ToList() ?? new List<ProductImage>()
            };
            
            var created = await _productService.CreateAsync(product, userId!);
            
            var response = new ProductResponse
            {
                Id = created.Id,
                Name = created.Name,
                Description = created.Description,
                Price = created.Price,
                StockQuantity = created.StockQuantity,
                Category = created.Category,
                Brand = created.Brand,
                Size = created.Size,
                Color = created.Color,
                ImageUrls = created.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                IsActive = created.IsActive,
                CreatedAt = created.CreatedAt,
                UpdatedAt = created.UpdatedAt,
                StoreId = created.StoreId,
                StoreName = created.Store?.Name ?? "Unknown Store"
            };
            
            return CreatedAtAction(nameof(GetProduct), new { id = created.Id }, response);
        }

        [Authorize(Roles = "Seller")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, UpdateProductRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            var updated = new Product
            {
                Name = request.Name ?? string.Empty,
                Description = request.Description,
                Price = request.Price ?? 0,
                StockQuantity = request.StockQuantity ?? 0,
                Category = request.Category,
                Brand = request.Brand,
                Size = request.Size,
                Color = request.Color,
                ProductImages = request.ImageUrls?.Select(url => new ProductImage { ImageUrl = url }).ToList() ?? new List<ProductImage>()
            };
            
            await _productService.UpdateAsync(id, updated, userId!);
            return NoContent();
        }

        [Authorize(Roles = "Seller")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await _productService.DeleteAsync(id, userId!);
            return NoContent();
        }
        [Authorize]
        [HttpPost("{id}/ratings")]
        public async Task<ActionResult<ProductRatingResponse>> AddRating(int id, ProductRatingRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return Unauthorized();
            if (id != request.ProductId) return BadRequest("ProductId mismatch");
            var result = await _productService.AddRatingAsync(request, userId);
            return Ok(result);
        }

        [HttpGet("{id}/ratings")]
        public async Task<ActionResult<List<ProductRatingResponse>>> GetRatings(int id)
        {
            var ratings = await _productService.GetRatingsForProductAsync(id);
            return Ok(ratings);
        }

        [Authorize]
        [HttpGet("{productId}/order/{orderId}/my-rating")]
        public async Task<ActionResult<ProductRatingResponse?>> GetMyRatingForProductInOrder(int productId, int orderId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return Unauthorized();
            var rating = await _productService.GetRatingForProductOrderUserAsync(productId, orderId, userId);
            if (rating == null) return Ok(null);
            return Ok(rating);
        }
    }
    
} 