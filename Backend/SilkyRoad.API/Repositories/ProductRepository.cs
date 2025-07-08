using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using SilkyRoad.API.Repositories.Interfaces;

namespace SilkyRoad.API.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly ApplicationDbContext _context;
        public ProductRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Product?> GetByIdAsync(int id)
        {
            return await _context.Products
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Product>> GetByStoreIdAsync(int storeId)
        {
            return await _context.Products.Where(p => p.StoreId == storeId && p.IsActive).ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetAllActiveAsync()
        {
            return await _context.Products.Where(p => p.IsActive).ToListAsync();
        }

        public async Task AddAsync(Product product)
        {
            await _context.Products.AddAsync(product);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Product product)
        {
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Product product)
        {
            product.IsActive = false;
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }
    }
} 