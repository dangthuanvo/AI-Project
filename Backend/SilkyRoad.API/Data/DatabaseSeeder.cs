using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Models;

namespace SilkyRoad.API.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedDataAsync(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            // Ensure database is created
            await context.Database.EnsureCreatedAsync();

            // Seed roles
            await SeedRolesAsync(roleManager);

            // Seed users
            await SeedUsersAsync(userManager);

            // Seed stores and products
            await SeedStoresAndProductsAsync(context, userManager);

            await context.SaveChangesAsync();
        }

        private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            var roles = new[] { "Admin", "Seller", "Customer" };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }
        }

        private static async Task SeedUsersAsync(UserManager<ApplicationUser> userManager)
        {
            // Admin user
            var adminEmail = "admin@gmail.com";
            if (await userManager.FindByEmailAsync(adminEmail) == null)
            {
                var admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FirstName = "Admin",
                    LastName = "User",
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow.AddHours(7)
                };

                var result = await userManager.CreateAsync(admin, "Admin123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, "Admin");
                }
            }

            // Seller users
            var sellers = new[]
            {
                new { Email = "seller1@gmail.com", FirstName = "Fashion", LastName = "Boutique", Password = "Seller123!" },
                new { Email = "seller2@gmail.com", FirstName = "Phone", LastName = "Lover", Password = "Seller123!" },
                new { Email = "seller3@gmail.com", FirstName = "TCG", LastName = "Collector", Password = "Seller123!" }
            };

            foreach (var seller in sellers)
            {
                if (await userManager.FindByEmailAsync(seller.Email) == null)
                {
                    var user = new ApplicationUser
                    {
                        UserName = seller.Email,
                        Email = seller.Email,
                        FirstName = seller.FirstName,
                        LastName = seller.LastName,
                        EmailConfirmed = true,
                        CreatedAt = DateTime.UtcNow.AddHours(7)
                    };

                    var result = await userManager.CreateAsync(user, seller.Password);
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, "Seller");
                    }
                }
            }

            // Customer user
            var customerEmail = "customer@gmail.com";
            if (await userManager.FindByEmailAsync(customerEmail) == null)
            {
                var customer = new ApplicationUser
                {
                    UserName = customerEmail,
                    Email = customerEmail,
                    FirstName = "John",
                    LastName = "Customer",
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow.AddHours(7)
                };

                var result = await userManager.CreateAsync(customer, "Customer123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(customer, "Customer");
                }
            }
        }

        private static async Task SeedStoresAndProductsAsync(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            var sellers = await userManager.GetUsersInRoleAsync("Seller");
            var sellerList = sellers.ToList();

            if (sellerList.Count >= 3)
            {
                // Check if stores already exist
                var existingStores = await context.Stores.ToListAsync();
                if (existingStores.Any())
                {
                    return; // Stores already exist, skip seeding
                }

                // Store 1: Fashion Boutique
                var store1 = new Store
                {
                    Name = "New Fashion",
                    Description = "Trendy and modern fashion for the contemporary woman",
                    LogoUrl = "/uploads/images/store1logo.gif",
                    BannerUrl = "/uploads/images/store1banner.jpg",
                    PrimaryColor = "#FF6B6B",
                    SecondaryColor = "#4ECDC4",
                    PositionX = 0,
                    OwnerId = sellerList[0].Id,
                    CreatedAt = DateTime.UtcNow.AddHours(7),
                    UpdatedAt = DateTime.UtcNow.AddHours(7)
                };

                context.Stores.Add(store1);
                await context.SaveChangesAsync();

                // Products for Store 1
                var products1 = new[]
                {
                    new Product {
                        Name = "Summer Dress", Description = "Light and breezy summer dress", Price = 89.99m, StockQuantity = 15, StoreId = store1.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store1product1.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Denim Jacket", Description = "Classic denim jacket with modern fit", Price = 129.99m, StockQuantity = 8, StoreId = store1.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store1product2.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Silk Blouse", Description = "Elegant silk blouse for professional wear", Price = 149.99m, StockQuantity = 12, StoreId = store1.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store1product3.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    }
                };

                context.Products.AddRange(products1);

                // Store 2: Urban Style
                var store2 = new Store
                {
                    Name = "Mobile Store",
                    Description = "High class phone",
                    LogoUrl = "/uploads/images/store2logo.gif",
                    BannerUrl = "/uploads/images/store2banner.jpg",
                    PrimaryColor = "#4ECDC4",
                    SecondaryColor = "#45B7AA",
                    PositionX = 400,
                    OwnerId = sellerList[1].Id,
                    CreatedAt = DateTime.UtcNow.AddHours(7),
                    UpdatedAt = DateTime.UtcNow.AddHours(7)
                };

                context.Stores.Add(store2);
                await context.SaveChangesAsync();

                // Products for Store 2
                var products2 = new[]
                {
                    new Product {
                        Name = "Xiaomi 13 Pro", Description = "High class phone", Price = 59.99m, StockQuantity = 20, StoreId = store2.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store2product1.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Iphone 15 Pro Max", Description = "High class phone", Price = 89.99m,StockQuantity = 20, StoreId = store2.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store2product2.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Samsung S24 Ultra", Description = "High class phone", Price = 79.99m, StockQuantity = 14, StoreId = store2.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store2product3.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    }
                };

                context.Products.AddRange(products2);

                // Store 3: Elegant Wear
                var store3 = new Store
                {
                    Name = "TCG Store",
                    Description = "Pokemon card",
                    LogoUrl = "/uploads/images/store3logo.gif",
                    BannerUrl = "/uploads/images/store3banner.jpg",
                    PrimaryColor = "#45B7AA",
                    SecondaryColor = "#96CEB4",
                    PositionX = 800,
                    OwnerId = sellerList[2].Id,
                    CreatedAt = DateTime.UtcNow.AddHours(7),
                    UpdatedAt = DateTime.UtcNow.AddHours(7)
                };

                context.Stores.Add(store3);
                await context.SaveChangesAsync();

                // Products for Store 3
                var products3 = new[]
                {
                    new Product {
                        Name = "Bulbasaur card", Description = "Pokemon card", Price = 299.99m, StockQuantity = 5, StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store3product1.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Charmander card", Description = "Pokemon card", Price = 199.99m, StockQuantity = 8, StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store3product2.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Squirtle card", Description = "Pokemon card", Price = 159.99m, StockQuantity = 12, StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store3product3.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Pikachu card", Description = "Pokemon card", Price = 179.99m, StockQuantity = 7, StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "/uploads/images/store3product4.jpg" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    }
                };

                context.Products.AddRange(products3);
                await context.SaveChangesAsync();
            }
        }
    }
} 