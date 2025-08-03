import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserVoucher } from '../models/voucher.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getUserVouchers(): Observable<UserVoucher[]> {
    return this.http.get<UserVoucher[]>(`${this.API_URL}/voucher/user-vouchers`);
  }
}
