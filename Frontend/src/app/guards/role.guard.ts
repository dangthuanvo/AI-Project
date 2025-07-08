import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot) {
    const requiredRole = route.data['role'];
    
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && user.roles.includes(requiredRole)) {
          return true;
        } else {
          this.router.navigate(['/virtual-street']);
          return false;
        }
      })
    );
  }
} 