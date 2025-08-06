import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Offer } from '../components/my-offer/my-offer.component';
import { environment } from '../../environments/environment';

export interface MakeOfferRequest {
  productId: number;
  offeredPrice: number;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class OfferService {
  private readonly API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  makeOffer(productId: number, offeredPrice: number, note?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/bargainoffer`, {
      productId,
      offeredPrice,
      note
    });
  }

  getMyOffers(): Observable<Offer[]> {
    return this.http.get<Offer[]>(`${this.API_URL}/bargainoffer/my`);
  }

  getOffersForSeller(): Observable<Offer[]> {
    return this.http.get<Offer[]>(`${this.API_URL}/bargainoffer/for-seller`);
  }

  respondToOffer(offerId: number, action: string, counterOfferPrice?: number): Observable<any> {
    return this.http.post(`${this.API_URL}/bargainoffer/respond`, {
      offerId,
      action,
      counterOfferPrice
    });
  }
}
