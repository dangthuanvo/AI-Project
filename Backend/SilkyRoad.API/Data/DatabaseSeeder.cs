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
            var adminEmail = "admin@silkyroad.com";
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
                new { Email = "seller1@silkyroad.com", FirstName = "Fashion", LastName = "Boutique", Password = "Seller123!" },
                new { Email = "seller2@silkyroad.com", FirstName = "Urban", LastName = "Style", Password = "Seller123!" },
                new { Email = "seller3@silkyroad.com", FirstName = "Elegant", LastName = "Wear", Password = "Seller123!" }
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
            var customerEmail = "customer@silkyroad.com";
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
                    Name = "Fashion Boutique",
                    Description = "Trendy and modern fashion for the contemporary woman",
                    LogoUrl = "https://via.placeholder.com/150x150/FF6B6B/FFFFFF?text=FB",
                    BannerUrl = "https://via.placeholder.com/400x200/FF6B6B/FFFFFF?text=Fashion+Boutique",
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
                        Name = "Summer Dress", Description = "Light and breezy summer dress", Price = 89.99m, StockQuantity = 15, Category = "Dresses", Brand = "Fashion Boutique", Size = "M", Color = "Blue", StoreId = store1.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=Summer+Dress" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Denim Jacket", Description = "Classic denim jacket with modern fit", Price = 129.99m, StockQuantity = 8, Category = "Jackets", Brand = "Fashion Boutique", Size = "L", Color = "Blue", StoreId = store1.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=Denim+Jacket" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Silk Blouse", Description = "Elegant silk blouse for professional wear", Price = 149.99m, StockQuantity = 12, Category = "Tops", Brand = "Fashion Boutique", Size = "S", Color = "White", StoreId = store1.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=Silk+Blouse" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    }
                };

                context.Products.AddRange(products1);

                // Store 2: Urban Style
                var store2 = new Store
                {
                    Name = "Urban Style",
                    Description = "Streetwear and casual fashion for the modern urbanite",
                    LogoUrl = "https://via.placeholder.com/150x150/4ECDC4/FFFFFF?text=US",
                    BannerUrl = "https://via.placeholder.com/400x200/4ECDC4/FFFFFF?text=Urban+Style",
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
                        Name = "Hoodie", Description = "Comfortable cotton hoodie", Price = 59.99m, StockQuantity = 20, Category = "Hoodies", Brand = "Urban Style", Size = "M", Color = "Gray", StoreId = store2.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=Hoodie" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Sneakers", Description = "Stylish sneakers for everyday wear", Price = 89.99m, StockQuantity = 10, Category = "Shoes", Brand = "Urban Style", Size = "42", Color = "White", StoreId = store2.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=Sneakers" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Cargo Pants", Description = "Functional cargo pants with multiple pockets", Price = 79.99m, StockQuantity = 14, Category = "Pants", Brand = "Urban Style", Size = "32", Color = "Khaki", StoreId = store2.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=Cargo+Pants" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    }
                };

                context.Products.AddRange(products2);

                // Store 3: Elegant Wear
                var store3 = new Store
                {
                    Name = "Elegant Wear",
                    Description = "Sophisticated and elegant clothing for special occasions",
                    LogoUrl = "https://via.placeholder.com/150x150/45B7AA/FFFFFF?text=EW",
                    BannerUrl = "https://via.placeholder.com/400x200/45B7AA/FFFFFF?text=Elegant+Wear",
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
                        Name = "Evening Gown", Description = "Stunning evening gown for formal events", Price = 299.99m, StockQuantity = 5, Category = "Dresses", Brand = "Elegant Wear", Size = "M", Color = "Black", StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/45B7AA/FFFFFF?text=Evening+Gown" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Business Suit", Description = "Professional business suit", Price = 199.99m, StockQuantity = 8, Category = "Suits", Brand = "Elegant Wear", Size = "L", Color = "Navy", StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/45B7AA/FFFFFF?text=Business+Suit" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Pearl Necklace", Description = "Elegant pearl necklace", Price = 159.99m, StockQuantity = 12, Category = "Accessories", Brand = "Elegant Wear", Size = "One Size", Color = "White", StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/45B7AA/FFFFFF?text=Pearl+Necklace" } },
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Product {
                        Name = "Cocktail Dress", Description = "Perfect cocktail dress for parties", Price = 179.99m, StockQuantity = 7, Category = "Dresses", Brand = "Elegant Wear", Size = "S", Color = "Red", StoreId = store3.Id,
                        ProductImages = new List<ProductImage> { new ProductImage { ImageUrl = "https://via.placeholder.com/300x400/45B7AA/FFFFFF?text=Cocktail+Dress" } },
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