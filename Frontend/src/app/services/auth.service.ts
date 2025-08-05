import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PresenceService } from './presence.service';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  avatar?: string;
  color?: string;
  pet?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  expiresAt: string;
  avatar?: string;
  color: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address?: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private presenceService: PresenceService) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userObj = JSON.parse(user);
        this.currentUserSubject.next(userObj);
        this.isAuthenticatedSubject.next(true);
        this.presenceService.startConnection(token);
      } catch (error) {
        this.clearStoredData();
      }
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, request)
      .pipe(
        map(response => {
          this.storeAuthData(response);
          this.presenceService.startConnection(response.token);
          return response;
        })
      );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, request)
      .pipe(
        map(response => {
          return response;
        })
      );
  }

  logout(): void {
    this.presenceService.stopConnection();
    this.clearStoredData();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private storeAuthData(response: AuthResponse): void {
    const user: User = {
      id: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      roles: response.roles,
      avatar: response.avatar || '/uploads/images/user-avatar.png',
      color: response.color
    };

    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(user));
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearStoredData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles.includes(role) || false;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setUserColor(color: string): void {
    const user = this.currentUserSubject.value;
    if (user) {
      (user as any).color = color;
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  setUserAvatar(avatar: string): void {
    const user = this.currentUserSubject.value;
    if (user) {
      (user as any).avatar = avatar;
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  updateProfile(profile: { firstName?: string; lastName?: string; color?: string; avatar?: string; pet?: string }): Observable<any> {
    return this.http.put(`${this.API_URL}/auth/profile`, profile).pipe(
      map((updated: any) => {
        const user = this.currentUserSubject.value;
        if (user) {
          user.firstName = updated.firstName ?? user.firstName;
          user.lastName = updated.lastName ?? user.lastName;
          (user as any).color = updated.color ?? (user as any).color;
          (user as any).avatar = updated.avatar ?? (user as any).avatar;
          if ('pet' in updated) {
            (user as any).pet = updated.pet;
          }
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        return updated;
      })
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/profile`).pipe(
      map((profile: any) => {
        const user = {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          roles: profile.roles,
          avatar: profile.avatar,
          color: profile.color,
          pet: profile.pet
        };
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      })
    );
  }

  updatePet(pet: string): Observable<any> {
    return this.http.put(`${this.API_URL}/auth/profile`, { pet }).pipe(
      map((updated: any) => {
        const user = this.currentUserSubject.value;
        if (user) {
          (user as any).pet = pet;
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        return updated;
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/forgot-password`, { email });
  }
} 