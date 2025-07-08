import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productImageUrl?: string;
  storeId: number;
  storeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CheckoutRequest {
  shippingAddress: string;
  customerPhone?: string;
}

export interface OrderSummary {
  orderId: number;
  orderNumber: string;
  storeName: string;
  totalAmount: number;
  itemCount: number;
}

export interface CheckoutResponse {
  orders: OrderSummary[];
  totalAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly API_URL = `${environment.apiUrl}`;
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartTotalSubject = new BehaviorSubject<number>(0);

  public cartItems$ = this.cartItemsSubject.asObservable();
  public cartTotal$ = this.cartTotalSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCart();
  }

  private loadCart(): void {
    this.getCart().subscribe();
  }

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(`${this.API_URL}/cart`).pipe(
      tap(cart => {
        this.cartItemsSubject.next(cart.items);
        this.cartTotalSubject.next(cart.totalAmount);
      })
    );
  }

  addToCart(request: AddToCartRequest): Observable<CartItem> {
    return this.http.post<CartItem>(`${this.API_URL}/cart/items`, request).pipe(
      tap(() => this.loadCart())
    );
  }

  updateCartItem(itemId: number, request: UpdateCartItemRequest): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/cart/items/${itemId}`, request).pipe(
      tap(() => this.loadCart())
    );
  }

  removeFromCart(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/cart/items/${itemId}`).pipe(
      tap(() => this.loadCart())
    );
  }

  clearCart(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/cart`).pipe(
      tap(() => {
        this.cartItemsSubject.next([]);
        this.cartTotalSubject.next(0);
      })
    );
  }

  getCartItemCount(): number {
    return this.cartItemsSubject.value.length;
  }

  getCartTotal(): number {
    return this.cartTotalSubject.value;
  }

  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.API_URL}/order/checkout`, request).pipe(
      tap(() => {
        this.cartItemsSubject.next([]);
        this.cartTotalSubject.next(0);
      })
    );
  }
} 