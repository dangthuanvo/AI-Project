using SilkyRoad.API.Models;
using SilkyRoad.API.Repositories.Interfaces;
using SilkyRoad.API.Services.Interfaces;
using SilkyRoad.API.Data;
using SilkyRoad.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace SilkyRoad.API.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        private readonly ApplicationDbContext _context;
        public ProductService(IProductRepository productRepository, ApplicationDbContext context)
        {
            _productRepository = productRepository;
            _context = context;
        }

        public async Task<Product?> GetByIdAsync(int id)
        {
            return await _context.Products
                .Include(p => p.Store)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Product>> GetByStoreIdAsync(int storeId)
        {
            return await _productRepository.GetByStoreIdAsync(storeId);
        }

        public async Task<IEnumerable<Product>> GetAllActiveAsync()
        {
            return await _productRepository.GetAllActiveAsync();
        }

        public async Task<Product> CreateAsync(Product product, string userId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (store == null)
                throw new Exception("Seller does not have a store");
            product.StoreId = store.Id;
            product.CreatedAt = DateTime.UtcNow.AddHours(7);
            product.UpdatedAt = DateTime.UtcNow.AddHours(7);
            product.IsActive = true;
            await _productRepository.AddAsync(product);
            
            // Return the product with Store and ProductImages included
            return await _context.Products
                .Include(p => p.Store)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.Id == product.Id) ?? product;
        }

        public async Task UpdateAsync(int id, Product updated, string userId)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                throw new Exception("Product not found");
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (store == null || product.StoreId != store.Id)
                throw new Exception("Forbidden");
            product.Name = updated.Name;
            product.Description = updated.Description;
            product.Price = updated.Price;
            product.StockQuantity = updated.StockQuantity;
            product.Category = updated.Category;
            product.Brand = updated.Brand;
            product.Size = updated.Size;
            product.Color = updated.Color;
            product.UpdatedAt = DateTime.UtcNow.AddHours(7);
            // Update images: remove old, add new
            _context.ProductImages.RemoveRange(product.ProductImages);
            if (updated.ProductImages != null)
            {
                foreach (var img in updated.ProductImages)
                {
                    product.ProductImages.Add(new ProductImage { ImageUrl = img.ImageUrl });
                }
            }
            await _productRepository.UpdateAsync(product);
        }

        public async Task DeleteAsync(int id, string userId)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                throw new Exception("Product not found");
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (store == null || product.StoreId != store.Id)
                throw new Exception("Forbidden");
            await _productRepository.DeleteAsync(product);
        }

        public async Task<ProductRatingResponse> AddRatingAsync(ProductRatingRequest request, string userId)
        {
            var user = await _context.Users.FindAsync(userId);
            var rating = new ProductRating
            {
                ProductId = request.ProductId,
                OrderId = request.OrderId,
                UserId = userId,
                Rating = request.Rating,
                Comment = request.Comment,
                ImageUrl = request.ImageUrl,
                CreatedAt = DateTime.UtcNow.AddHours(7)
            };
            _context.ProductRatings.Add(rating);
            await _context.SaveChangesAsync();
            return new ProductRatingResponse
            {
                Id = rating.Id,
                ProductId = rating.ProductId,
                OrderId = rating.OrderId,
                Rating = rating.Rating,
                Comment = rating.Comment,
                ImageUrl = rating.ImageUrl,
                UserId = rating.UserId,
                UserName = (user != null ? (user.FirstName + " " + user.LastName).Trim() : null),
                UserAvatar = user?.Avatar,
                CreatedAt = rating.CreatedAt
            };
        }

        public async Task<List<ProductRatingResponse>> GetRatingsForProductAsync(int productId)
        {
            return await _context.ProductRatings
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ProductRatingResponse
                {
                    Id = r.Id,
                    ProductId = r.ProductId,
                    OrderId = r.OrderId,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ImageUrl = r.ImageUrl,
                    UserId = r.UserId,
                    UserName = (r.User.FirstName + " " + r.User.LastName).Trim(),
                    UserAvatar = r.User.Avatar,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<ProductRatingResponse?> GetRatingForProductOrderUserAsync(int productId, int orderId, string userId)
        {
            var rating = await _context.ProductRatings
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.OrderId == orderId && r.UserId == userId);

            if (rating == null)
                return null;

            return new ProductRatingResponse
            {
                Id = rating.Id,
                Rating = rating.Rating,
                Comment = rating.Comment,
                ImageUrl = rating.ImageUrl,
                UserName = rating.User?.FirstName + " " + rating.User?.LastName,
                UserAvatar = rating.User?.Avatar,
                CreatedAt = rating.CreatedAt
            };
        }

        public async Task<IEnumerable<Product>> GetRelatedProductsAsync(int productId, int limit)
        {
            // Get the current product to find related criteria
            var currentProduct = await _context.Products
                .Include(p => p.ProductImages)
                .Include(p => p.Store)
                .FirstOrDefaultAsync(p => p.Id == productId && p.IsActive);

            if (currentProduct == null)
                return new List<Product>();

            // Get all active products except the current one
            var allProducts = await _context.Products
                .Include(p => p.ProductImages)
                .Include(p => p.Store)
                .Where(p => p.Id != productId && p.IsActive)
                .ToListAsync();

            // Calculate similarity scores based on name
            var productsWithScores = allProducts.Select(p => new
            {
                Product = p,
                SimilarityScore = CalculateNameSimilarity(currentProduct.Name, p.Name)
            })
            .Where(p => p.SimilarityScore > 0) // Only include products with some similarity
            .OrderByDescending(p => p.SimilarityScore)
            .Take(limit)
            .Select(p => p.Product)
            .ToList();

            return productsWithScores;
        }

        private double CalculateNameSimilarity(string name1, string name2)
        {
            if (string.IsNullOrEmpty(name1) || string.IsNullOrEmpty(name2))
                return 0;

            // Convert to lowercase for comparison
            name1 = name1.ToLower().Trim();
            name2 = name2.ToLower().Trim();

            // If names are identical, return maximum score
            if (name1 == name2)
                return 1.0;

            // Split names into words
            var words1 = name1.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var words2 = name2.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (words1.Length == 0 || words2.Length == 0)
                return 0;

            // Calculate word overlap
            var commonWords = words1.Intersect(words2, StringComparer.OrdinalIgnoreCase).Count();
            var totalWords = Math.Max(words1.Length, words2.Length);

            if (totalWords == 0)
                return 0;

            // Calculate similarity based on word overlap
            var wordSimilarity = (double)commonWords / totalWords;

            // Also check for substring matches (partial word matches)
            var substringScore = 0.0;
            foreach (var word1 in words1)
            {
                foreach (var word2 in words2)
                {
                    if (word1.Contains(word2) || word2.Contains(word1))
                    {
                        substringScore += 0.3; // Partial match bonus
                        break;
                    }
                }
            }

            // Combine word similarity and substring similarity
            var finalScore = Math.Min(wordSimilarity + substringScore, 1.0);
            return finalScore;
        }
    }
} 