import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MinigameRewardRequest {
  minigameId: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

@Injectable({ providedIn: 'root' })
export class MinigameService {
  private readonly API_URL = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  rewardVoucher(request: MinigameRewardRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/minigame/reward-voucher`, request);
  }
}
