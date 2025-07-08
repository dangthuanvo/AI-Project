using SilkyRoad.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SilkyRoad.API.Repositories.Interfaces
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(int id);
        Task<IEnumerable<Product>> GetByStoreIdAsync(int storeId);
        Task<IEnumerable<Product>> GetAllActiveAsync();
        Task AddAsync(Product product);
        Task UpdateAsync(Product product);
        Task DeleteAsync(Product product);
    }
} 