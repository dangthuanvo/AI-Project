import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order } from '../components/order-tracking/order-tracking.component';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getUserOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.API_URL}/order/my-orders`);
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/order/${orderId}`);
  }

  getOrderByNumber(orderNumber: string): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/order/number/${orderNumber}`);
  }

  // For admin/seller use - get all orders
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.API_URL}/order`);
  }

  // For admin/seller use - update order status
  updateOrderStatus(orderId: string, status: string, trackingNumber?: string): Observable<Order> {
    return this.http.put<Order>(`${this.API_URL}/order/${orderId}/status`, {
      status,
      trackingNumber
    });
  }
} 