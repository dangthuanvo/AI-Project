import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  ownerId: string;
  ownerName: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
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
  imageUrls?: string[];
  isActive: boolean;
  storeId: number;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualStreetResponse {
  stores: Store[];
  totalStores: number;
}

export interface CreateStoreRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  positionX: number;
}

export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  positionX?: number;
}

export interface MonthlyStats {
  year: number;
  labels: string[];
  orders: number[];
  revenue: number[];
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private readonly API_URL = 'https://localhost:7001/api';

  constructor(private http: HttpClient) {}

  getVirtualStreet(): Observable<VirtualStreetResponse> {
    return this.http.get<VirtualStreetResponse>(`${this.API_URL}/stores/virtual-street`);
  }

  getStore(id: number): Observable<Store> {
    return this.http.get<Store>(`${this.API_URL}/stores/${id}`);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/product/${id}`);
  }

  getStoreProducts(storeId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.API_URL}/stores/${storeId}/products`);
  }

  createStore(request: CreateStoreRequest): Observable<Store> {
    return this.http.post<Store>(`${this.API_URL}/stores`, request);
  }

  updateStore(id: number, request: UpdateStoreRequest): Observable<Store> {
    return this.http.put<Store>(`${this.API_URL}/stores/${id}`, request);
  }

  deleteStore(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/stores/${id}`);
  }

  getMyStore(): Observable<Store> {
    return this.http.get<Store>(`${this.API_URL}/stores/my-store`);
  }

  updateMyStore(request: UpdateStoreRequest): Observable<Store> {
    return this.http.put<Store>(`${this.API_URL}/stores/my-store`, request);
  }

  createProduct(storeId: number, product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.API_URL}/product`, { ...product, storeId });
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.API_URL}/product/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/product/${id}`);
  }

  getUserStores(): Observable<Store> {
    return this.http.get<Store>(`${this.API_URL}/stores/my-store`);
  }

  getStoreOrders(storeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/stores/${storeId}/orders`);
  }

  addProduct(productData: any): Observable<Product> {
    return this.http.post<Product>(`${this.API_URL}/product`, productData);
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/order/${orderId}/status`, { status });
  }

  getMonthlyStats(year?: number): Observable<MonthlyStats> {
    let params = new HttpParams();
    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<MonthlyStats>(`${this.API_URL}/order/stats/monthly`, { params });
  }
} 