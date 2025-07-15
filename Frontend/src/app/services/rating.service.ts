import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProductRatings(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/product/${productId}/ratings`);
  }

  getMyRatingForProductInOrder(productId: number, orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/product/${productId}/order/${orderId}/my-rating`);
  }
} 