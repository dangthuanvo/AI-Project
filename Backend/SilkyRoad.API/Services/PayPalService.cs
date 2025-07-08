using PayPalCheckoutSdk.Core;
using PayPalCheckoutSdk.Orders;
using System.Text.Json;
using System.Net.Http;
using System.Text;

namespace SilkyRoad.API.Services
{
    public class PayPalService
    {
        private readonly IConfiguration _configuration;
        private readonly PayPalHttpClient? _client;
        private readonly bool _isConfigured;
        private readonly bool _useMockMode;

        public PayPalService(IConfiguration configuration)
        {
            _configuration = configuration;
            
            var clientId = _configuration["PayPal:ClientId"];
            var clientSecret = _configuration["PayPal:ClientSecret"];
            
            // Check if we should use mock mode for testing
            _useMockMode = _configuration["PayPal:UseMockMode"] == "true";
            
            if (_useMockMode)
            {
                _isConfigured = true;
                _client = null;
            }
            else if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || 
                clientId == "YOUR_PAYPAL_CLIENT_ID_HERE" || clientSecret == "YOUR_PAYPAL_CLIENT_SECRET_HERE")
            {
                _isConfigured = false;
                _client = null;
            }
            else
            {
                _isConfigured = true;
                var environment = _configuration["PayPal:Mode"] == "live" 
                    ? new LiveEnvironment(clientId, clientSecret)
                    : (PayPalEnvironment)new SandboxEnvironment(clientId, clientSecret);
                
                _client = new PayPalHttpClient(environment);
            }
        }

        public async Task<Order> CreateOrderAsync(decimal amount, string phone, string address, string currency = "USD")
        {
            if (_useMockMode)
            {
                // Return mock PayPal order for testing
                return new Order
                {
                    Id = $"MOCK_ORDER_{Guid.NewGuid():N}",
                    Status = "CREATED",
                    Links = new List<LinkDescription>
                    {
                        new LinkDescription
                        {
                            Rel = "approve",
                            Href = "https://www.sandbox.paypal.com/checkoutnow?token=MOCK_TOKEN"
                        }
                    }
                };
            }

            if (!_isConfigured || _client == null)
            {
                throw new InvalidOperationException("PayPal is not configured. Please add valid PayPal credentials to appsettings.json or set UseMockMode to true");
            }

            var request = new OrdersCreateRequest();
            request.Prefer("return=representation");
            request.RequestBody(BuildRequestBody(amount, phone, address, currency));

            var response = await _client.Execute(request);
            var result = response.Result<PayPalCheckoutSdk.Orders.Order>();
            
            return result;
        }

        public async Task<PayPalCheckoutSdk.Orders.Order> CaptureOrderAsync(string orderId)
        {
            if (_useMockMode)
            {
                // Return mock captured order for testing
                return new PayPalCheckoutSdk.Orders.Order
                {
                    Id = orderId,
                    Status = "COMPLETED",
                    PurchaseUnits = new List<PurchaseUnit>
                    {
                        new PurchaseUnit
                        {
                            Payments = new PaymentCollection
                            {
                                Captures = new List<Capture>
                                {
                                    new Capture
                                    {
                                        Id = $"MOCK_CAPTURE_{Guid.NewGuid():N}"
                                    }
                                }
                            }
                        }
                    }
                };
            }

            if (!_isConfigured || _client == null)
            {
                throw new InvalidOperationException("PayPal is not configured. Please add valid PayPal credentials to appsettings.json or set UseMockMode to true");
            }

            try
            {
                Console.WriteLine($"PayPalService: Capturing order {orderId}");
                
                // Use direct HTTP request to avoid SDK body handling issues
                using var httpClient = new HttpClient();
                
                // Get access token
                var clientId = _configuration["PayPal:ClientId"];
                var clientSecret = _configuration["PayPal:ClientSecret"];
                var isLive = _configuration["PayPal:Mode"] == "live";
                var baseUrl = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
                
                // Get access token
                var tokenRequest = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("grant_type", "client_credentials")
                });
                
                var authString = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authString);
                
                var tokenResponse = await httpClient.PostAsync($"{baseUrl}/v1/oauth2/token", tokenRequest);
                var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
                Console.WriteLine($"Token response: {tokenContent}");
                
                if (!tokenResponse.IsSuccessStatusCode)
                {
                    throw new Exception($"Failed to get access token: {tokenContent}");
                }
                
                var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenContent);
                var accessToken = tokenData.GetProperty("access_token").GetString();
                
                // Capture the order
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");
                
                var captureBody = new StringContent("{}", Encoding.UTF8, "application/json");
                var captureResponse = await httpClient.PostAsync($"{baseUrl}/v2/checkout/orders/{orderId}/capture", captureBody);
                var captureContent = await captureResponse.Content.ReadAsStringAsync();
                Console.WriteLine($"Capture response: {captureContent}");
                
                if (!captureResponse.IsSuccessStatusCode)
                {
                    throw new Exception($"Failed to capture order: {captureContent}");
                }
                
                // Parse the response back to PayPal SDK Order object
                var captureData = JsonSerializer.Deserialize<JsonElement>(captureContent);
                
                var result = new PayPalCheckoutSdk.Orders.Order
                {
                    Id = captureData.GetProperty("id").GetString(),
                    Status = captureData.GetProperty("status").GetString(),
                    PurchaseUnits = new List<PurchaseUnit>()
                };
                
                if (captureData.TryGetProperty("purchase_units", out var purchaseUnits))
                {
                    foreach (var unit in purchaseUnits.EnumerateArray())
                    {
                        var purchaseUnit = new PurchaseUnit();
                        
                        if (unit.TryGetProperty("payments", out var payments))
                        {
                            purchaseUnit.Payments = new PaymentCollection();
                            
                            if (payments.TryGetProperty("captures", out var captures))
                            {
                                purchaseUnit.Payments.Captures = new List<Capture>();
                                
                                foreach (var capture in captures.EnumerateArray())
                                {
                                    purchaseUnit.Payments.Captures.Add(new Capture
                                    {
                                        Id = capture.GetProperty("id").GetString()
                                    });
                                }
                            }
                        }
                        
                        result.PurchaseUnits.Add(purchaseUnit);
                    }
                }
                
                Console.WriteLine($"PayPalService: Order captured successfully. Status: {result.Status}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PayPalService: Error capturing order {orderId}: {ex.Message}");
                Console.WriteLine($"PayPalService: Exception type: {ex.GetType().Name}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"PayPalService: Inner exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        public async Task<PayPalCheckoutSdk.Orders.Order> GetOrderAsync(string orderId)
        {
            if (_useMockMode)
            {
                // Return mock order details for testing
                return new PayPalCheckoutSdk.Orders.Order
                {
                    Id = orderId,
                    Status = "COMPLETED",
                    PurchaseUnits = new List<PurchaseUnit>
                    {
                        new PurchaseUnit
                        {
                            Amount = new AmountWithBreakdown
                            {
                                Value = "10.00",
                                CurrencyCode = "USD"
                            }
                        }
                    }
                };
            }

            if (!_isConfigured || _client == null)
            {
                throw new InvalidOperationException("PayPal is not configured. Please add valid PayPal credentials to appsettings.json or set UseMockMode to true");
            }

            var request = new OrdersGetRequest(orderId);
            var response = await _client.Execute(request);
            var result = response.Result<PayPalCheckoutSdk.Orders.Order>();
            
            return result;
        }

        private OrderRequest BuildRequestBody(decimal amount, string phone, string address, string currency)
        {
            return new OrderRequest()
            {
                Intent = "CAPTURE",
                PurchaseUnits = new List<PurchaseUnitRequest>
                {
                    new PurchaseUnitRequest
                    {
                        Amount = new AmountWithBreakdown
                        {
                            CurrencyCode = currency,
                            Value = amount.ToString("F2")
                        }
                    }
                },
                ApplicationContext = new ApplicationContext
                {
                    ReturnUrl = "http://localhost:4200/checkout",
                    CancelUrl = "http://localhost:4200/checkout"
                }
            };
        }
    }
} 