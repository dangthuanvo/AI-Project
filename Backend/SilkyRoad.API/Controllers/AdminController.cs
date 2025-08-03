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
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public AdminController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        // Dashboard Statistics
        [HttpGet("stats/system")]
        public async Task<ActionResult<object>> GetSystemStats()
        {
            var totalUsers = await _userManager.Users.CountAsync();
            var totalStores = await _context.Stores.CountAsync();
            var totalProducts = await _context.Products.CountAsync();
            var totalOrders = await _context.Orders.CountAsync();
            var totalRevenue = await _context.Orders
                .Where(o => o.Status == "Delivered" || o.Status == "Paid")
                .SumAsync(o => o.TotalAmount);

            // Generate revenue history for the last 6 months
            var revenueHistory = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var month = DateTime.UtcNow.AddMonths(-i);
                var monthRevenue = await _context.Orders
                    .Where(o => o.Status == "Delivered" || o.Status == "Paid")
                    .Where(o => o.OrderDate.Month == month.Month && o.OrderDate.Year == month.Year)
                    .SumAsync(o => o.TotalAmount);
                
                revenueHistory.Add(new
                {
                    month = month.ToString("MMM"),
                    revenue = monthRevenue
                });
            }

            return Ok(new
            {
                totalUsers,
                totalStores,
                totalProducts,
                totalOrders,
                totalRevenue,
                systemUptime = "99.9%",
                lastBackup = DateTime.UtcNow.AddHours(-2).ToString("yyyy-MM-dd HH:mm:ss"),
                activeSessions = totalUsers, // Simplified for demo
                revenueHistory
            });
        }

        [HttpGet("stats/top-stores-revenue")]
    public async Task<ActionResult<IEnumerable<object>>> GetTopStoresByRevenue(int top = 5)
    {
        var topStores = (
        from oi in _context.OrderItems
        join o in _context.Orders on oi.OrderId equals o.Id
        join p in _context.Products on oi.ProductId equals p.Id
        join s in _context.Stores on p.StoreId equals s.Id
        where o.Status == "Delivered" || o.Status == "Paid"
        select new
        {
            StoreId = s.Id,
            StoreName = s.Name,
            Quantity = oi.Quantity,
            UnitPrice = oi.UnitPrice
        }
    )
    .AsEnumerable()
    .GroupBy(x => new { x.StoreId, x.StoreName })
    .Select(g => new
    {
        StoreId = g.Key.StoreId,
        StoreName = g.Key.StoreName,
        Revenue = g.Sum(x => x.Quantity * x.UnitPrice)
    })
    .OrderByDescending(x => x.Revenue)
    .Take(top)
    .ToList();

    return Ok(topStores);
    }

    [HttpGet("stats/users")]
        public async Task<ActionResult<object>> GetUserStats()
        {
            var users = await _userManager.Users.ToListAsync();
            var totalUsers = users.Count;
            var activeUsers = users.Count(u => u.IsActive);
            var inactiveUsers = totalUsers - activeUsers;

            var customers = await _userManager.GetUsersInRoleAsync("Customer");
            var sellers = await _userManager.GetUsersInRoleAsync("Seller");
            var admins = await _userManager.GetUsersInRoleAsync("Admin");

            var thisMonth = DateTime.UtcNow.AddMonths(-1);
            var newUsersThisMonth = users.Count(u => u.CreatedAt >= thisMonth);

            // Generate user growth history for the last 6 months
            var userGrowthHistory = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var month = DateTime.UtcNow.AddMonths(-i);
                var newUsersInMonth = users.Count(u => u.CreatedAt.Month == month.Month && u.CreatedAt.Year == month.Year);
                
                userGrowthHistory.Add(new
                {
                    month = month.ToString("MMM"),
                    newUsers = newUsersInMonth
                });
            }

            return Ok(new
            {
                totalUsers,
                activeUsers,
                inactiveUsers,
                customers = customers.Count,
                sellers = sellers.Count,
                admins = admins.Count,
                newUsersThisMonth,
                userGrowthHistory
            });
        }

        [HttpGet("stats/stores")]
        public async Task<ActionResult<object>> GetStoreStats()
        {
            var stores = await _context.Stores.Include(s => s.Products).ToListAsync();
            var totalStores = stores.Count;
            var activeStores = stores.Count(s => s.IsActive);
            var inactiveStores = totalStores - activeStores;
            var totalProducts = stores.Sum(s => s.Products.Count);
            var averageProductsPerStore = totalStores > 0 ? (double)totalProducts / totalStores : 0;

            var thisMonth = DateTime.UtcNow.AddMonths(-1);
            var newStoresThisMonth = stores.Count(s => s.CreatedAt >= thisMonth);

            return Ok(new
            {
                totalStores,
                activeStores,
                inactiveStores,
                totalProducts,
                averageProductsPerStore,
                newStoresThisMonth
            });
        }

        [HttpGet("stats/orders")]
        public async Task<ActionResult<object>> GetOrderStats()
        {
            var orders = await _context.Orders.ToListAsync();
            var totalOrders = orders.Count;
            var pendingOrders = orders.Count(o => o.Status == "Pending");
            var acceptedOrders = orders.Count(o => o.Status == "Accepted");
            var shippedOrders = orders.Count(o => o.Status == "Shipped");
            var deliveredOrders = orders.Count(o => o.Status == "Delivered");
            var totalRevenue = orders
                .Where(o => o.Status == "Delivered" || o.Status == "Paid")
                .Sum(o => o.TotalAmount);
            var averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            var thisMonth = DateTime.UtcNow.AddMonths(-1);
            var ordersThisMonth = orders.Count(o => o.OrderDate >= thisMonth);

            // Generate order status history
            var orderStatusHistory = new List<object>
            {
                new { status = "Pending", count = pendingOrders },
                new { status = "Accepted", count = acceptedOrders },
                new { status = "Shipped", count = shippedOrders },
                new { status = "Delivered", count = deliveredOrders }
            };

            return Ok(new
            {
                totalOrders,
                pendingOrders,
                acceptedOrders,
                shippedOrders,
                deliveredOrders,
                totalRevenue,
                averageOrderValue,
                ordersThisMonth,
                orderStatusHistory
            });
        }

        [HttpGet("stats/products")]
        public async Task<ActionResult<object>> GetProductStats()
        {
            var products = await _context.Products.ToListAsync();
            var totalProducts = products.Count;
            var activeProducts = products.Count(p => p.IsActive);
            var inactiveProducts = totalProducts - activeProducts;
            var lowStockProducts = products.Count(p => p.StockQuantity <= 5 && p.StockQuantity > 0);
            var outOfStockProducts = products.Count(p => p.StockQuantity == 0);
            var averagePrice = products.Any() ? products.Average(p => p.Price) : 0;

            var thisMonth = DateTime.UtcNow.AddMonths(-1);
            var newProductsThisMonth = products.Count(p => p.CreatedAt >= thisMonth);

            return Ok(new
            {
                totalProducts,
                activeProducts,
                inactiveProducts,
                lowStockProducts,
                outOfStockProducts,
                averagePrice,
                newProductsThisMonth
            });
        }

        // User Management
        [HttpGet("users")]
        public async Task<ActionResult<List<object>>> GetAllUsers()
        {
            var users = await _userManager.Users.ToListAsync();
            var userList = new List<object>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                userList.Add(new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.Address,
                    user.CreatedAt,
                    user.LastLoginAt,
                    user.IsActive,
                    user.Avatar,
                    user.Color,
                    Roles = roles.ToList()
                });
            }

            return Ok(userList);
        }

        [HttpGet("users/{userId}")]
        public async Task<ActionResult<object>> GetUserById(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound();

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Address,
                user.CreatedAt,
                user.LastLoginAt,
                user.IsActive,
                user.Avatar,
                user.Color,
                Roles = roles.ToList()
            });
        }

        [HttpPut("users/{userId}")]
        public async Task<ActionResult<object>> UpdateUser(string userId, [FromBody] UpdateUserRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound();

            user.FirstName = request.FirstName ?? user.FirstName;
            user.LastName = request.LastName ?? user.LastName;
            user.IsActive = request.IsActive ?? user.IsActive;
            user.Color = request.Color ?? user.Color;
            user.Avatar = request.Avatar ?? user.Avatar;

            // Update roles if provided
            if (!string.IsNullOrEmpty(request.Role))
            {
                var currentRoles = await _userManager.GetRolesAsync(user);
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, request.Role);
            }

            await _userManager.UpdateAsync(user);

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Address,
                user.CreatedAt,
                user.LastLoginAt,
                user.IsActive,
                user.Avatar,
                user.Color,
                Roles = roles.ToList()
            });
        }

        [HttpPut("users/{userId}/deactivate")]
        public async Task<ActionResult> DeactivateUser(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound();

            user.IsActive = false;
            await _userManager.UpdateAsync(user);
            return Ok(new { message = "User deactivated successfully" });
        }

        [HttpPut("users/{userId}/activate")]
        public async Task<ActionResult> ActivateUser(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound();

            user.IsActive = true;
            await _userManager.UpdateAsync(user);
            return Ok(new { message = "User activated successfully" });
        }

        [HttpDelete("users/{userId}")]
        public async Task<ActionResult> DeleteUser(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound();

            await _userManager.DeleteAsync(user);
            return Ok(new { message = "User deleted successfully" });
        }

        [HttpPost("users")]
        public async Task<ActionResult<object>> CreateUser([FromBody] RegisterUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) || string.IsNullOrWhiteSpace(request.Role))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return Conflict(new { message = "A user with this email already exists." });
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Color = request.Color,
                Avatar = request.Avatar,
                Address = request.Address
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });
            }

            // Ensure role exists
            if (!await _roleManager.RoleExistsAsync(request.Role))
            {
                await _roleManager.CreateAsync(new IdentityRole(request.Role));
            }
            await _userManager.AddToRoleAsync(user, request.Role);

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Address,
                user.CreatedAt,
                user.IsActive,
                user.Avatar,
                user.Color,
                Roles = new[] { request.Role }
            });
        }

        // Store Management
        [HttpGet("stores")]
        public async Task<ActionResult<List<object>>> GetAllStores()
        {
            var stores = await _context.Stores
                .Include(s => s.Owner)
                .Include(s => s.Products)
                .ToListAsync();

            var storeList = stores.Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.LogoUrl,
                s.BannerUrl,
                s.PrimaryColor,
                s.SecondaryColor,
                s.PositionX,
                s.IsActive,
                s.CreatedAt,
                s.UpdatedAt,
                OwnerId = s.OwnerId,
                OwnerName = $"{s.Owner.FirstName} {s.Owner.LastName}",
                ProductCount = s.Products.Count(p => p.IsActive),
                Products = s.Products.Where(p => p.IsActive).Select(p => new
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
                    p.IsActive,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.StoreId
                }).ToList()
            }).ToList();

            return Ok(storeList);
        }

        [HttpGet("stores/{storeId}")]
        public async Task<ActionResult<object>> GetStoreById(int storeId)
        {
            var store = await _context.Stores
                .Include(s => s.Owner)
                .Include(s => s.Products)
                .FirstOrDefaultAsync(s => s.Id == storeId);

            if (store == null)
                return NotFound();

            return Ok(new
            {
                store.Id,
                store.Name,
                store.Description,
                store.LogoUrl,
                store.BannerUrl,
                store.PrimaryColor,
                store.SecondaryColor,
                store.PositionX,
                store.IsActive,
                store.CreatedAt,
                store.UpdatedAt,
                OwnerId = store.OwnerId,
                OwnerName = $"{store.Owner.FirstName} {store.Owner.LastName}",
                ProductCount = store.Products.Count(p => p.IsActive),
                Products = store.Products.Where(p => p.IsActive).Select(p => new
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
                    p.IsActive,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.StoreId
                }).ToList()
            });
        }

        [HttpPut("stores/{storeId}/deactivate")]
        public async Task<ActionResult> DeactivateStore(int storeId)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null)
                return NotFound();

            store.IsActive = false;
            store.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Store deactivated successfully" });
        }

        [HttpPut("stores/{storeId}/activate")]
        public async Task<ActionResult> ActivateStore(int storeId)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null)
                return NotFound();

            store.IsActive = true;
            store.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Store activated successfully" });
        }

        [HttpDelete("stores/{storeId}")]
        public async Task<ActionResult> DeleteStore(int storeId)
        {
            var store = await _context.Stores.FindAsync(storeId);
            if (store == null)
                return NotFound();

            _context.Stores.Remove(store);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Store deleted successfully" });
        }

        // Product Management
        [HttpGet("products")]
        public async Task<ActionResult<List<object>>> GetAllProducts()
        {
            var products = await _context.Products
                .Include(p => p.Store)
                .Include(p => p.ProductImages)
                .ToListAsync();

            var productList = products.Select(p => new
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
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                StoreId = p.StoreId,
                StoreName = p.Store?.Name ?? "Unknown Store",
                ImageUrls = p.ProductImages.Select(pi => pi.ImageUrl).ToList()
            }).ToList();

            return Ok(productList);
        }

        [HttpGet("products/{productId}")]
        public async Task<ActionResult<object>> GetProductById(int productId)
        {
            var product = await _context.Products
                .Include(p => p.Store)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.Id == productId);

            if (product == null)
                return NotFound();

            return Ok(new
            {
                product.Id,
                product.Name,
                product.Description,
                product.Price,
                product.StockQuantity,
                product.Category,
                product.Brand,
                product.Size,
                product.Color,
                product.IsActive,
                product.CreatedAt,
                product.UpdatedAt,
                StoreId = product.StoreId,
                StoreName = product.Store?.Name ?? "Unknown Store",
                ImageUrls = product.ProductImages.Select(pi => pi.ImageUrl).ToList()
            });
        }

        [HttpPut("products/{productId}/deactivate")]
        public async Task<ActionResult> DeactivateProduct(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
                return NotFound();

            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Product deactivated successfully" });
        }

        [HttpPut("products/{productId}/activate")]
        public async Task<ActionResult> ActivateProduct(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
                return NotFound();

            product.IsActive = true;
            product.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Product activated successfully" });
        }

        [HttpDelete("products/{productId}")]
        public async Task<ActionResult> DeleteProduct(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
                return NotFound();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Product deleted successfully" });
        }

        // Order Management
        [HttpGet("orders")]
        public async Task<ActionResult<List<object>>> GetAllOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.UserVoucher)
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .ThenInclude(p => p.Store)
                .ToListAsync();

            var orderList = orders.Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.UserId,
                o.CustomerName,
                o.CustomerEmail,
                o.ShippingAddress,
                o.OrderDate,
                o.Status,
                o.TotalAmount,
                o.PayPalTransactionId,
                o.PayPalOrderId,
                o.ShippedDate,
                o.DeliveredDate,
                o.UserVoucher,
                Items = o.Items.Select(oi => new
                {
                    oi.Id,
                    oi.ProductId,
                    oi.Quantity,
                    oi.UnitPrice,
                    oi.ProductName,
                    oi.ProductImageUrl,
                    StoreId = oi.Product.StoreId,
                    StoreName = oi.Product.Store.Name
                }).ToList()
            }).ToList();

            return Ok(orderList);
        }

        [HttpGet("orders/{orderId}")]
        public async Task<ActionResult<object>> GetOrderById(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .ThenInclude(p => p.Store)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
                return NotFound();

            return Ok(new
            {
                order.Id,
                order.OrderNumber,
                order.UserId,
                order.CustomerName,
                order.CustomerEmail,
                order.ShippingAddress,
                order.OrderDate,
                order.Status,
                order.TotalAmount,
                order.PayPalTransactionId,
                order.PayPalOrderId,
                order.ShippedDate,
                order.DeliveredDate,
                Items = order.Items.Select(oi => new
                {
                    oi.Id,
                    oi.ProductId,
                    oi.Quantity,
                    oi.UnitPrice,
                    oi.ProductName,
                    oi.ProductImageUrl,
                    StoreId = oi.Product.StoreId,
                    StoreName = oi.Product.Store.Name
                }).ToList()
            });
        }

        [HttpPut("orders/{orderId}/status")]
        public async Task<ActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                return NotFound();

            order.Status = request.Status;
            if (request.Status == "Shipped")
            {
                order.ShippedDate = DateTime.UtcNow;
            }
            else if (request.Status == "Delivered")
            {
                order.DeliveredDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Order status updated successfully" });
        }
    }

    public class UpdateUserRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Role { get; set; }
        public bool? IsActive { get; set; }
        public string? Color { get; set; }
        public string? Avatar { get; set; }
    }

    // DTO for admin user creation
    public class RegisterUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Color { get; set; }
        public string? Avatar { get; set; }
        public string? Address { get; set; }
    }
} 