import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PayPalOrderResponse {
  orderId: string;
  status: string;
}

export interface PayPalCaptureResponse {
  orderId: string;
  status: string;
  transactionId?: string;
  orderNumber: number;
  orderCount: number;
}

export interface PayPalOrderDetails {
  orderId: string;
  status: string;
  amount?: string;
  currency?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PayPalService {
  private readonly API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  createOrder(amount: number, shippingInfo: any): Observable<PayPalOrderResponse> {
    return this.http.post<PayPalOrderResponse>(`${this.API_URL}/paypal/create-order`, { amount, phone: shippingInfo.phone, address: shippingInfo.address });
  }

  captureOrder(orderId: string): Observable<PayPalCaptureResponse> {
    return this.http.post<PayPalCaptureResponse>(`${this.API_URL}/paypal/capture-order/${orderId}`, null);
  }

  getOrder(orderId: string): Observable<PayPalOrderDetails> {
    return this.http.get<PayPalOrderDetails>(`${this.API_URL}/paypal/order/${orderId}`);
  }

  redirectToPayPal(approvalUrl: string): void {
    window.location.href = approvalUrl;
  }
} 