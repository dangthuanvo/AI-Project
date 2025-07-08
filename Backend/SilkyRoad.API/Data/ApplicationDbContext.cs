using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SilkyRoad.API.Models;

namespace SilkyRoad.API.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Store> Stores { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }
        public DbSet<PendingOrderInfo> PendingOrderInfos { get; set; }
        public DbSet<ShippingInfo> ShippingInfos { get; set; }
        
        // Chat entities
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatConversation> ChatConversations { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure ApplicationUser
            builder.Entity<ApplicationUser>(entity =>
            {
                entity.HasOne(u => u.Store)
                      .WithOne(s => s.Owner)
                      .HasForeignKey<Store>(s => s.OwnerId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(u => u.Cart)
                      .WithOne(c => c.User)
                      .HasForeignKey<Cart>(c => c.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Store
            builder.Entity<Store>(entity =>
            {
                entity.Property(s => s.PositionX).IsRequired();
            });

            // Configure Product
            builder.Entity<Product>(entity =>
            {
                entity.HasOne(p => p.Store)
                      .WithMany(s => s.Products)
                      .HasForeignKey(p => p.StoreId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.Property(p => p.Price).HasPrecision(18, 2);
            });

            // Configure Cart
            builder.Entity<Cart>(entity =>
            {
                entity.HasOne(c => c.User)
                      .WithOne(u => u.Cart)
                      .HasForeignKey<Cart>(c => c.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure CartItem
            builder.Entity<CartItem>(entity =>
            {
                entity.HasOne(ci => ci.Cart)
                      .WithMany(c => c.Items)
                      .HasForeignKey(ci => ci.CartId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(ci => ci.Product)
                      .WithMany(p => p.CartItems)
                      .HasForeignKey(ci => ci.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(ci => new { ci.CartId, ci.ProductId }).IsUnique();
                
                entity.Property(ci => ci.UnitPrice).HasPrecision(18, 2);
            });

            // Configure Order
            builder.Entity<Order>(entity =>
            {
                entity.HasOne(o => o.User)
                      .WithMany(u => u.Orders)
                      .HasForeignKey(o => o.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(o => o.OrderNumber).IsUnique();
                
                entity.Property(o => o.TotalAmount).HasPrecision(18, 2);
            });

            // Configure OrderItem
            builder.Entity<OrderItem>(entity =>
            {
                entity.HasOne(oi => oi.Order)
                      .WithMany(o => o.Items)
                      .HasForeignKey(oi => oi.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(oi => oi.Product)
                      .WithMany(p => p.OrderItems)
                      .HasForeignKey(oi => oi.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
                
                entity.Property(oi => oi.UnitPrice).HasPrecision(18, 2);
            });

            builder.Entity<ProductImage>()
                .HasOne(pi => pi.Product)
                .WithMany(p => p.ProductImages)
                .HasForeignKey(pi => pi.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure ChatMessage
            builder.Entity<ChatMessage>(entity =>
            {
                entity.HasOne(cm => cm.Sender)
                      .WithMany(u => u.SentMessages)
                      .HasForeignKey(cm => cm.SenderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cm => cm.Receiver)
                      .WithMany(u => u.ReceivedMessages)
                      .HasForeignKey(cm => cm.ReceiverId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cm => cm.Store)
                      .WithMany()
                      .HasForeignKey(cm => cm.StoreId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(cm => new { cm.SenderId, cm.ReceiverId, cm.SentAt });
            });

            // Configure ChatConversation
            builder.Entity<ChatConversation>(entity =>
            {
                entity.HasOne(cc => cc.User1)
                      .WithMany(u => u.ConversationsAsUser1)
                      .HasForeignKey(cc => cc.User1Id)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cc => cc.User2)
                      .WithMany(u => u.ConversationsAsUser2)
                      .HasForeignKey(cc => cc.User2Id)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cc => cc.Store)
                      .WithMany()
                      .HasForeignKey(cc => cc.StoreId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Ensure unique conversations between users
                entity.HasIndex(cc => new { cc.User1Id, cc.User2Id }).IsUnique();
                entity.HasIndex(cc => new { cc.User2Id, cc.User1Id }).IsUnique();
            });
        }
    }
} 