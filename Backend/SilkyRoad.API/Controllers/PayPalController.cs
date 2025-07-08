using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SilkyRoad.API.Services;
using SilkyRoad.API.DTOs;
using SilkyRoad.API.Data;
using SilkyRoad.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SilkyRoad.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace SilkyRoad.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PayPalController : ControllerBase
    {
        private readonly PayPalService _payPalService;
        private readonly ApplicationDbContext _context;
        private readonly IMailService _mailService;
        private readonly ILogger<PayPalController> _logger;

        public PayPalController(PayPalService payPalService, ApplicationDbContext context, IMailService mailService, ILogger<PayPalController> logger)
        {
            _payPalService = payPalService;
            _context = context;
            _mailService = mailService;
            _logger = logger;
        }

        [HttpPost("create-order")]
        public async Task<ActionResult<PayPalOrderResponse>> CreateOrder([FromBody] DTOs.CreateOrderRequest request)
        {
            try
            {
                // Get the current user
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // Get the user's cart to calculate total amount
                var cart = await _context.Carts
                    .Include(c => c.Items)
                    .ThenInclude(ci => ci.Product)
                    .ThenInclude(p => p.ProductImages)
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (cart == null || !cart.Items.Any())
                {
                    return BadRequest(new { error = "No items in cart" });
                }

                var totalAmount = cart.Items.Sum(ci => ci.TotalPrice);

                // Create PayPal order
                var order = await _payPalService.CreateOrderAsync(totalAmount, request.Phone, request.Address);
                
                // Save pending order info
                var pendingOrderInfo = new PendingOrderInfo
                {
                    PayPalOrderId = order.Id,
                    Phone = request.Phone,
                    Address = request.Address,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow.AddHours(7)
                };

                _context.PendingOrderInfos.Add(pendingOrderInfo);
                await _context.SaveChangesAsync();
                
                var response = new PayPalOrderResponse
                {
                    OrderId = order.Id,
                    Status = order.Status
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Failed to create PayPal order", details = ex.Message });
            }
        }

        [HttpPost("capture-order/{orderId}")]
        public async Task<ActionResult<PayPalCaptureResponse>> CaptureOrder(string orderId)
        {
            try
            {
                Console.WriteLine($"Attempting to capture PayPal order: {orderId}");
                
                var order = await _payPalService.CaptureOrderAsync(orderId);
                Console.WriteLine($"PayPal order captured successfully: {order.Id}, Status: {order.Status}");
                
                // Get the current user
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    Console.WriteLine("User ID not found in claims");
                    return Unauthorized();
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    Console.WriteLine($"User not found: {userId}");
                    return Unauthorized();
                }

                // Get pending order info
                var pendingOrderInfo = await _context.PendingOrderInfos
                    .FirstOrDefaultAsync(poi => poi.PayPalOrderId == orderId && poi.UserId == userId);
                
                if (pendingOrderInfo == null)
                {
                    Console.WriteLine($"Pending order info not found for PayPal order: {orderId}");
                    return BadRequest(new { error = "Order information not found" });
                }

                // Get the user's cart
                var cart = await _context.Carts
                    .Include(c => c.Items)
                    .ThenInclude(ci => ci.Product)
                    .ThenInclude(p => p.ProductImages)
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (cart == null || !cart.Items.Any())
                {
                    Console.WriteLine($"No cart or cart items found for user: {userId}");
                    return BadRequest(new { error = "No items in cart" });
                }

                Console.WriteLine($"Found cart with {cart.Items.Count} items for user: {userId}");

                // Group cart items by store
                var itemsByStore = cart.Items
                    .GroupBy(ci => ci.Product.StoreId)
                    .ToList();

                Console.WriteLine($"Items grouped into {itemsByStore.Count} stores");

                var createdOrders = new List<Order>();
                var allOrderItems = new List<OrderItem>();

                // Create separate orders for each store
                foreach (var storeGroup in itemsByStore)
                {
                    var storeId = storeGroup.Key;
                    var storeItems = storeGroup.ToList();
                    var storeTotal = storeItems.Sum(ci => ci.TotalPrice);

                    // Get store information
                    var store = await _context.Stores.FindAsync(storeId);
                    if (store == null)
                    {
                        Console.WriteLine($"Store not found: {storeId}");
                        continue;
                    }

                    // Create order for this store
                    var newOrder = new Order
                    {
                        UserId = userId,
                        OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                        CustomerName = $"{user.FirstName} {user.LastName}",
                        CustomerEmail = user.Email,
                        ShippingAddress = pendingOrderInfo.Address,
                        CustomerPhone = pendingOrderInfo.Phone,
                        OrderDate = DateTime.UtcNow.AddHours(7),
                        Status = "Pending",
                        TotalAmount = storeTotal,
                        PayPalTransactionId = order.PurchaseUnits?.FirstOrDefault()?.Payments?.Captures?.FirstOrDefault()?.Id,
                        PayPalOrderId = orderId,    
                    };

                    _context.Orders.Add(newOrder);
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Created order for store {store.Name}: {newOrder.Id}");

                    // Create order items for this store
                    var orderItems = storeItems.Select(ci => new OrderItem
                    {
                        OrderId = newOrder.Id,
                        ProductId = ci.ProductId,
                        Quantity = ci.Quantity,
                        UnitPrice = ci.UnitPrice,
                        ProductName = ci.Product.Name,
                        ProductImageUrl = GetImageUrl(ci.Product.ProductImages.FirstOrDefault()?.ImageUrl)
                    }).ToList();

                    allOrderItems.AddRange(orderItems);
                    createdOrders.Add(newOrder);

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

                // Remove pending order info
                _context.PendingOrderInfos.Remove(pendingOrderInfo);

                await _context.SaveChangesAsync();
                Console.WriteLine($"Created {createdOrders.Count} orders with {allOrderItems.Count} total items");
                
                // Send order confirmation email for each order
                foreach (var createdOrder in createdOrders)
                {
                    var items = allOrderItems.Where(oi => oi.OrderId == createdOrder.Id).ToList();
                    foreach (var item in items)
                    {
                        _logger.LogInformation($"Order item image URL for email: {item.ProductImageUrl}");
                    }
                    var emailBody = $@"<h2>Thank you for your order, {createdOrder.CustomerName}!</h2>
                    <p>Order Number: <b>{createdOrder.OrderNumber}</b></p>
                    <p>Order Date: {createdOrder.OrderDate:yyyy-MM-dd HH:mm}</p>
                    <p>Store: {createdOrder.Items.FirstOrDefault()?.Product?.Store?.Name ?? ""}</p>
                    <p>Shipping Address: {createdOrder.ShippingAddress}</p>
                    <p>Phone: {createdOrder.CustomerPhone}</p>
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
                    <h3>Total Amount: {createdOrder.TotalAmount:C}</h3>
                    <p>If you have any questions, please contact us.</p>";
                    var subject = $"Order Confirmation - {createdOrder.OrderNumber}";
                    _logger.LogInformation($"Sending order confirmation email to {createdOrder.CustomerEmail} with subject '{subject}'");
                    try
                    {
                        await _mailService.SendEmailAsync(createdOrder.CustomerEmail!, subject, emailBody);
                        _logger.LogInformation($"Order confirmation email sent to {createdOrder.CustomerEmail}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to send order confirmation email to {createdOrder.CustomerEmail}");
                    }
                }

                var response = new PayPalCaptureResponse
                {
                    OrderId = order.Id,
                    Status = order.Status,
                    TransactionId = order.PurchaseUnits?.FirstOrDefault()?.Payments?.Captures?.FirstOrDefault()?.Id,
                    OrderNumber = createdOrders.First().Id, // Return the first order ID for backward compatibility
                    OrderCount = createdOrders.Count
                };

                Console.WriteLine($"Returning successful response: {JsonSerializer.Serialize(response)}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error capturing PayPal order: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return BadRequest(new { error = "Failed to capture PayPal order", details = ex.Message });
            }
        }

        [HttpGet("order/{orderId}")]
        public async Task<ActionResult<PayPalOrderDetails>> GetOrder(string orderId)
        {
            try
            {
                var order = await _payPalService.GetOrderAsync(orderId);
                
                var response = new PayPalOrderDetails
                {
                    OrderId = order.Id,
                    Status = order.Status,
                    Amount = order.PurchaseUnits?.FirstOrDefault()?.Amount?.Value,
                    Currency = order.PurchaseUnits?.FirstOrDefault()?.Amount?.CurrencyCode
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Failed to get PayPal order", details = ex.Message });
            }
        }

        // Helper to get absolute image URL (mimics frontend ImageService)
        private string GetImageUrl(string? imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl))
                return "";
            if (imageUrl.StartsWith("http://") || imageUrl.StartsWith("https://"))
                return imageUrl;
            if (imageUrl.StartsWith("/"))
            {
                var request = HttpContext.Request;
                var baseUrl = $"{request.Scheme}://{request.Host}";
                return $"{baseUrl}{imageUrl}";
            }
            // If it doesn't start with /, assume it's relative to uploads
            var req = HttpContext.Request;
            var baseU = $"{req.Scheme}://{req.Host}";
            return $"{baseU}/uploads/{imageUrl}";
        }
    }
} 