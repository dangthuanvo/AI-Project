using SilkyRoad.API.Models;
using SilkyRoad.API.Repositories.Interfaces;
using SilkyRoad.API.Services.Interfaces;
using SilkyRoad.API.Data;
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
    }
} 