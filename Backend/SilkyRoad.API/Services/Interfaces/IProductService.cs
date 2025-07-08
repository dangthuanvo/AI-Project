using SilkyRoad.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SilkyRoad.API.Services.Interfaces
{
    public interface IProductService
    {
        Task<Product?> GetByIdAsync(int id);
        Task<IEnumerable<Product>> GetByStoreIdAsync(int storeId);
        Task<IEnumerable<Product>> GetAllActiveAsync();
        Task<Product> CreateAsync(Product product, string userId);
        Task UpdateAsync(int id, Product updated, string userId);
        Task DeleteAsync(int id, string userId);
    }
} 