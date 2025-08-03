using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using SilkyRoad.API.DTOs;
using System.Security.Claims;
using System.Linq;
using SilkyRoad.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/order")]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMailService _mailService;
        private readonly ILogger<OrderController> _logger;
        public OrderController(ApplicationDbContext context, IMailService mailService, ILogger<OrderController> logger)
        {
            _context = context;
            _mailService = mailService;
            _logger = logger;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.User)
                .Include(o => o.UserVoucher)
                .ToListAsync();
            return Ok(orders);
        }

        [HttpGet("my-orders")]
        public async Task<ActionResult<IEnumerable<Order>>> GetUserOrders()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var orders = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.UserVoucher)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
            return Ok(orders);
        }

        [HttpGet("number/{orderNumber}")]
        public async Task<ActionResult<Order>> GetOrderByNumber(string orderNumber)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var order = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.UserVoucher)
                .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber && o.UserId == userId);
            if (order == null)
                return NotFound();
            return Ok(order);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var order = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.UserVoucher)
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
            if (order == null)
                return NotFound();
            return Ok(order);
        }

        [HttpPost]
        public async Task<ActionResult<Order>> CreateOrder([FromBody] Order order)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
                return Unauthorized();
            order.UserId = userId;
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Pending";
            _context.Orders.Add(order);

            // Reduce stock for each product in the order
            foreach (var item in order.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    product.StockQuantity -= item.Quantity;
                    if (product.StockQuantity < 0)
                        product.StockQuantity = 0;
                }
            }

            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
        }

        [HttpPost("checkout")]
        public async Task<ActionResult<CheckoutResponse>> Checkout([FromBody] CheckoutRequest request)
        {
            _logger.LogInformation("Checkout endpoint called for user: {UserId}", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized();

            // Get the user's cart
            var cart = await _context.Carts
                .Include(c => c.Items)
                .ThenInclude(ci => ci.Product)
                .ThenInclude(p => p.Store)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.Items.Any())
                return BadRequest(new { error = "No items in cart" });

            // Group cart items by store
            var itemsByStore = cart.Items
                .GroupBy(ci => ci.Product.StoreId)
                .ToList();

            var createdOrders = new List<Order>();
            var allOrderItems = new List<OrderItem>();
            var orderSummaries = new List<OrderSummary>();

            // Create separate orders for each store
            foreach (var storeGroup in itemsByStore)
            {
                var storeId = storeGroup.Key;
                var storeItems = storeGroup.ToList();
                var storeTotal = storeItems.Sum(ci => ci.TotalPrice);
                var store = storeItems.First().Product.Store;

                // Create order for this store
                var newOrder = new Order
                {
                    UserId = userId,
                    OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                    CustomerName = $"{user.FirstName} {user.LastName}",
                    CustomerEmail = user.Email,
                    ShippingAddress = request.ShippingAddress,
                    CustomerPhone = request.CustomerPhone,
                    OrderDate = DateTime.UtcNow,
                    Status = "Pending",
                    TotalAmount = storeTotal
                };

                _context.Orders.Add(newOrder);
                await _context.SaveChangesAsync();

                // Create order items for this store
                var orderItems = storeItems.Select(ci => new OrderItem
                {
                    OrderId = newOrder.Id,
                    ProductId = ci.ProductId,
                    Quantity = ci.Quantity,
                    UnitPrice = ci.UnitPrice,
                    ProductName = ci.Product.Name,
                    ProductImageUrl = ci.Product.ProductImages.FirstOrDefault()?.ImageUrl
                }).ToList();

                allOrderItems.AddRange(orderItems);
                createdOrders.Add(newOrder);

                // Create order summary
                orderSummaries.Add(new OrderSummary
                {
                    OrderId = newOrder.Id,
                    OrderNumber = newOrder.OrderNumber,
                    StoreName = store.Name,
                    TotalAmount = storeTotal,
                    ItemCount = storeItems.Count
                });

                // Reduce stock for products in this store
                foreach (var item in storeItems)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product != null)
                    {
                        product.StockQuantity -= item.Quantity;
                        if (product.StockQuantity < 0)
                            product.StockQuantity = 0;
                    }
                }
            }

            // Add all order items
            _context.OrderItems.AddRange(allOrderItems);

            // Clear the cart
            _context.CartItems.RemoveRange(cart.Items);
            _context.Carts.Remove(cart);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Created {OrderCount} orders in checkout.", createdOrders.Count);

            // Send order confirmation email for each order
            foreach (var order in createdOrders)
            {
                var items = allOrderItems.Where(oi => oi.OrderId == order.Id).ToList();
                var emailBody = $@"<h2>Thank you for your order, {order.CustomerName}!</h2>
                <p>Order Number: <b>{order.OrderNumber}</b></p>
                <p>Order Date: {order.OrderDate:yyyy-MM-dd HH:mm}</p>
                <p>Store: {order.Items.FirstOrDefault()?.Product?.Store?.Name ?? ""}</p>
                <p>Shipping Address: {order.ShippingAddress}</p>
                <p>Phone: {order.CustomerPhone}</p>
                <h3>Order Details:</h3>
                <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
                  <tr>
                    <th>Product</th>
                    <th>Image</th>
                    <th>Unit Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                  {string.Join("", items.Select(item => $"<tr><td>{item.ProductName}</td><td><img src='{item.ProductImageUrl}' alt='{item.ProductName}' width='60'/></td><td>{item.UnitPrice:C}</td><td>{item.Quantity}</td><td>{(item.UnitPrice * item.Quantity):C}</td></tr>"))}
                </table>
                <h3>Total Amount: {order.TotalAmount:C}</h3>
                <p>If you have any questions, please contact us.</p>";
                var subject = $"Order Confirmation - {order.OrderNumber}";
                _logger.LogInformation($"Sending order confirmation email to {order.CustomerEmail} with subject '{subject}'");
                try
                {
                    await _mailService.SendEmailAsync(order.CustomerEmail!, subject, emailBody);
                    _logger.LogInformation($"Order confirmation email sent to {order.CustomerEmail}");

                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to send order confirmation email to {order.CustomerEmail}");
                }
            }

            var response = new CheckoutResponse
            {
                Orders = orderSummaries,
                TotalAmount = orderSummaries.Sum(o => o.TotalAmount)
            };

            _logger.LogInformation("Checkout endpoint completed for user: {UserId}", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);

            return Ok(response);
        }

        [Authorize(Roles = "Seller")]
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
                return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound("Order not found");

            // Verify the order contains products from the seller's store
            var sellerStore = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (sellerStore == null)
                return NotFound("Seller store not found");

            var hasStoreProducts = order.Items.Any(oi => oi.Product.StoreId == sellerStore.Id);
            if (!hasStoreProducts)
                return Forbid("Order does not contain products from your store");

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

        [Authorize(Roles = "Seller")]
        [HttpGet("stats/monthly")]
        public async Task<ActionResult<object>> GetMonthlyStats([FromQuery] int? year = null)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
                return Unauthorized();

            // Get the seller's store
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerId == userId);
            if (store == null)
                return NotFound("Store not found");

            // Use specified year or current year
            var targetYear = year ?? DateTime.UtcNow.Year;
            var startDate = new DateTime(targetYear, 1, 1);
            var endDate = new DateTime(targetYear, 12, 31);

            // Get orders for this store for the specified year, only delivered
            var orders = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .Where(o => o.Items.Any(oi => oi.Product.StoreId == store.Id) && 
                           o.OrderDate >= startDate && 
                           o.OrderDate <= endDate &&
                           o.Status == "Delivered")
                .ToListAsync();

            // Initialize arrays for 12 months
            var monthlyOrders = new int[12];
            var monthlyRevenue = new decimal[12];
            var monthNames = new string[12];

            // Process each month
            for (int month = 1; month <= 12; month++)
            {
                monthNames[month - 1] = new DateTime(targetYear, month, 1).ToString("MMM");

                // Get orders for this month
                var monthOrders = orders.Where(o => o.OrderDate.Month == month).ToList();

                monthlyOrders[month - 1] = monthOrders.Count;
                monthlyRevenue[month - 1] = monthOrders.Sum(o => o.TotalAmount);
            }

            return Ok(new
            {
                year = targetYear,
                labels = monthNames,
                orders = monthlyOrders,
                revenue = monthlyRevenue
            });
        }
    }
} 