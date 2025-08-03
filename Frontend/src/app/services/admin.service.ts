import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserGrowthHistoryItem {
  month: string;
  newUsers: number;
}

  export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  customers: number;
  sellers: number;
  admins: number;
  newUsersThisMonth: number;
  userGrowthHistory?: UserGrowthHistoryItem[];
}

export interface StoreStats {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  totalProducts: number;
  averageProductsPerStore: number;
  newStoresThisMonth: number;
}

export interface OrderStatusHistoryItem {
  status: string;
  count: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersThisMonth: number;
  orderStatusHistory?: OrderStatusHistoryItem[];
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  averagePrice: number;
  newProductsThisMonth: number;
}

export interface RevenueHistoryItem {
  month: string;
  revenue: number;
}

export interface SystemStats {
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  systemUptime: string;
  lastBackup: string;
  activeSessions: number;
  revenueHistory?: RevenueHistoryItem[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  address?: string;
  avatar?: string;
  color?: string;
}

export interface Store {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  positionX: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerName: string;
  productCount: number;
  products?: Product[];
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  storeId: number;
  storeName?: string;
  imageUrls?: string[];
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  trackingNumber?: string;
  payPalTransactionId?: string;
  payPalOrderId?: string;
  shippedDate?: string;
  deliveredDate?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  productName: string;
  productImageUrl?: string;
  storeId: number;
  storeName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // Dashboard Statistics
  getSystemStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.API_URL}/admin/stats/system`);
  }

  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.API_URL}/admin/stats/users`);
  }

  getStoreStats(): Observable<StoreStats> {
    return this.http.get<StoreStats>(`${this.API_URL}/admin/stats/stores`);
  }

  getOrderStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.API_URL}/admin/stats/orders`);
  }

  getProductStats(): Observable<ProductStats> {
    return this.http.get<ProductStats>(`${this.API_URL}/admin/stats/products`);
  }

  // User Management
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/admin/users`);
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/admin/users/${userId}`);
  }

  updateUser(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/admin/users/${userId}`, userData);
  }

  deactivateUser(userId: string): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/users/${userId}/deactivate`, {});
  }

  activateUser(userId: string): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/users/${userId}/activate`, {});
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/users/${userId}`);
  }

  createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    color?: string;
    avatar?: string;
    address?: string;
  }): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/admin/users`, userData);
  }

  // Store Management
  getAllStores(): Observable<Store[]> {
    return this.http.get<Store[]>(`${this.API_URL}/admin/stores`);
  }

  getStoreById(storeId: number): Observable<Store> {
    return this.http.get<Store>(`${this.API_URL}/admin/stores/${storeId}`);
  }

  deactivateStore(storeId: number): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/stores/${storeId}/deactivate`, {});
  }

  activateStore(storeId: number): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/stores/${storeId}/activate`, {});
  }

  deleteStore(storeId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/stores/${storeId}`);
  }

  // Product Management
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.API_URL}/admin/products`);
  }

  getProductById(productId: number): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/admin/products/${productId}`);
  }

  deactivateProduct(productId: number): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/products/${productId}/deactivate`, {});
  }

  activateProduct(productId: number): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/products/${productId}/activate`, {});
  }

  deleteProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/products/${productId}`);
  }

  // Order Management
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.API_URL}/admin/orders`);
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/admin/orders/${orderId}`);
  }

  updateOrderStatus(orderId: number, status: string): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/admin/orders/${orderId}/status`, { status });
  }

  // System Management
  getSystemLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/admin/system/logs`);
  }

  backupDatabase(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/admin/system/backup`, {});
  }

  getSystemHealth(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/system/health`);
  }

  // Analytics
  getRevenueAnalytics(period: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/analytics/revenue?period=${period}`);
  }

  getUserAnalytics(period: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/analytics/users?period=${period}`);
  }

  getProductAnalytics(period: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/admin/analytics/products?period=${period}`);
  }
} 