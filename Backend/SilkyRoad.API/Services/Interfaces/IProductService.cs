using SilkyRoad.API.DTOs;
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
        Task<ProductRatingResponse> AddRatingAsync(ProductRatingRequest request, string userId);
        Task<List<ProductRatingResponse>> GetRatingsForProductAsync(int productId);
        Task<ProductRatingResponse?> GetRatingForProductOrderUserAsync(int productId, int orderId, string userId);
        Task<IEnumerable<Product>> GetRelatedProductsAsync(int productId, int limit);
    }
} 