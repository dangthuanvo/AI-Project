import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ShippingInfo {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

@Injectable({ providedIn: 'root' })
export class ShippingInfoService {
  private readonly API_URL = `${environment.apiUrl}/ShippingInfo`;

  constructor(private http: HttpClient) {}

  getShippingInfos(): Observable<ShippingInfo[]> {
    return this.http.get<ShippingInfo[]>(this.API_URL);
  }

  addShippingInfo(info: ShippingInfo): Observable<ShippingInfo> {
    return this.http.post<ShippingInfo>(this.API_URL, info);
  }

  updateShippingInfo(id: number, info: ShippingInfo): Observable<ShippingInfo> {
    return this.http.put<ShippingInfo>(`${this.API_URL}/${id}`, info);
  }

  deleteShippingInfo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
} 