# Silky Road - Virtual Street Shopping Marketplace

A multi-seller online clothing marketplace with a unique 2D horizontal virtual street shopping experience. Users can browse stores positioned along a virtual street, each with customizable themes and layouts.

## 🚀 Features

- **Virtual Street Experience**: Horizontal scrollable 2D street with positioned stores
- **Multi-Seller Platform**: Sellers can create and customize their own stores
- **Role-Based Access**: Customer, Seller, and Admin roles with different permissions
- **Shopping Cart**: Multi-store shopping cart functionality
- **PayPal Integration**: Secure payment processing
- **Responsive Design**: Works on desktop and mobile devices
- **JWT Authentication**: Secure API access with role-based authorization

## 🛠 Tech Stack

### Backend
- **ASP.NET Core 7.0** Web API
- **Entity Framework Core** with SQL Server
- **ASP.NET Identity** for user management
- **JWT Bearer Tokens** for authentication
- **PayPal SDK** for payment processing

### Frontend
- **Angular 16** with TypeScript
- **Angular Material** for UI components
- **RxJS** for reactive programming
- **PayPal JavaScript SDK** for client-side payments

## 📋 Prerequisites

- .NET 7.0 SDK
- SQL Server (LocalDB or full instance)
- Node.js 18+ and npm
- Angular CLI (`npm install -g @angular/cli`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- (Optional) [Git](https://git-scm.com/) for cloning the repository

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd Backend/SilkyRoad.API

# Restore NuGet packages
dotnet restore

# Update database connection string in appsettings.json
# Default: "Server=(localdb)\\mssqllocaldb;Database=SilkyRoadDB;Trusted_Connection=true;MultipleActiveResultSets=true"

# Run Entity Framework migrations
dotnet ef database update

# Start the API
dotnet run
```

The API will be available at `https://localhost:7001`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd Frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:4200`

## 🔧 Configuration

### Backend Configuration

Update `Backend/SilkyRoad.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Your_SQL_Server_Connection_String"
  },
  "JwtSettings": {
    "SecretKey": "Your_Super_Secret_Key_Here",
    "Issuer": "SilkyRoad",
    "Audience": "SilkyRoadUsers",
    "ExpirationInMinutes": 60
  },
  "PayPal": {
    "ClientId": "your_paypal_client_id_here",
    "ClientSecret": "your_paypal_client_secret_here",
    "Mode": "sandbox"
  }
}
```

### Frontend Configuration

Update `Frontend/src/index.html`:
```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD"></script>
```

## 👥 Default Users

The application comes with pre-seeded users:

### Admin
- Email: `admin@silkyroad.com`
- Password: `Admin123!`

### Sellers
- Email: `seller1@silkyroad.com` / Password: `Seller123!`
- Email: `seller2@silkyroad.com` / Password: `Seller123!`
- Email: `seller3@silkyroad.com` / Password: `Seller123!`

### Customer
- Email: `customer@silkyroad.com`
- Password: `Customer123!`

### Paypal account
- Account: 'sb-najdz28837071@personal.example.com'
- Password: 'U<.4teA8'
## 🏪 Sample Stores

The application includes 3 sample stores with products:

1. **Fashion Boutique** - Trendy women's fashion
2. **Urban Style** - Streetwear and casual clothing
3. **Elegant Wear** - Formal and special occasion wear

## 🎨 Virtual Street Features

### Store Positioning
- Each store has a `PositionX` property that determines its exact position on the virtual street
- Stores are displayed in order from left to right based on their position
- Sellers can customize their store's position through the seller dashboard

### Store Customization
- **Logo & Banner**: Custom images for store branding
- **Theme Colors**: Primary and secondary colors for store styling
- **Description**: Store information and details
- **Position**: Horizontal position on the virtual street

### Interactive Elements
- **Street Lamps**: Animated lighting effects
- **Store Cards**: Hover effects and smooth transitions
- **Responsive Design**: Works on all screen sizes

## 🔐 Authentication & Authorization

### JWT Token Flow
1. User registers/logs in
2. Server validates credentials and returns JWT token
3. Frontend stores token in localStorage
4. Token is automatically included in API requests
5. Server validates token and checks role permissions

### Role-Based Access
- **Customer**: Browse stores, add to cart, checkout
- **Seller**: Manage store, add/edit products, view orders
- **Admin**: User management, store moderation, system administration

## 🛒 Shopping Cart

### Multi-Store Support
- Add products from different stores to the same cart
- Each cart item includes store information
- Checkout processes all items together

### Cart Features
- Real-time cart updates
- Quantity management
- Remove items
- Cart persistence across sessions

## 💳 Payment Integration

### PayPal Setup
1. Create a PayPal Developer account
2. Create a new app to get Client ID and Secret
3. Update configuration in both backend and frontend
4. Test with PayPal sandbox environment

### Payment Flow
1. User proceeds to checkout
2. Cart total is calculated
3. PayPal order is created
4. User completes payment on PayPal
5. Order is confirmed and saved

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Stores
- `GET /api/stores/virtual-street` - Get all stores for virtual street
- `GET /api/stores/{id}` - Get store details
- `POST /api/stores` - Create store (Seller only)
- `PUT /api/stores/{id}` - Update store (Owner only)

### Products
- `GET /api/stores/{storeId}/products` - Get store products
- `POST /api/products` - Add product (Seller only)
- `PUT /api/products/{id}` - Update product (Owner only)
- `DELETE /api/products/{id}` - Delete product (Owner only)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/{id}` - Update cart item
- `DELETE /api/cart/items/{id}` - Remove cart item

### Orders
- `POST /api/order` - Create order
- `GET /api/order` - Get user orders
- `GET /api/order/{id}` - Get order details

## 🚀 Deployment

### Backend Deployment
1. Build the application: `dotnet publish -c Release`
2. Deploy to your hosting provider (Azure, AWS, etc.)
3. Update connection strings and environment variables
4. Run database migrations on production

### Frontend Deployment
1. Build the application: `ng build --prod`
2. Deploy the `dist/silky-road` folder to your hosting provider
3. Update API URLs for production environment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation at `/swagger` when running the backend

## 🔮 Future Enhancements

- Real-time notifications
- Advanced search and filtering
- Store analytics dashboard
- Mobile app development
- Social features (reviews, ratings)
- Advanced payment options
- Inventory management
- Shipping integration

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/dangthuanvo/AI-Project.git
   cd AI-Project
   ```

2. **Build and run the application:**
   ```sh
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: [http://localhost:4200](http://localhost:4200)
   - Backend API: [http://localhost:5000](http://localhost:5000)
   - SQL Server: localhost:1433 (for development tools)

## Notes
- The first build may take several minutes as Docker downloads images and installs dependencies.
- Uploaded files are stored in `Backend/SilkyRoad.API/wwwroot/uploads` and are persisted via Docker volume mapping.
- Default database credentials are set in `docker-compose.yml` for development only.

## Troubleshooting
- If you encounter port conflicts, ensure ports 1433, 5000, 7001, and 4200 are free.
- For HTTPS issues, the backend is configured to use HTTP only in Docker.

---

For any issues, please contact your instructor or project maintainer. 