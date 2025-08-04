import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { ChatService } from './services/chat.service';
import { MatDialog } from '@angular/material/dialog';
import { ProfileDialogComponent } from './components/profile-dialog/profile-dialog.component';
import { filter } from 'rxjs/operators';
import { ChatComponent } from './components/chat/chat.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // Properties
  title = 'Silky Road';
  isAuthenticated = false;
  user: any = null;
  cartItemCount = 0;
  unreadCount = 0;
  hideNavbar = false;
  showAnimatedBackground = false;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private chatService: ChatService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // Listen to route changes to hide navbar on auth pages
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const navEnd = event as NavigationEnd;
      const authRoutes = ['/login', '/register', '/forgot-password'];
      const splashRoutes = ['/splash'];
      this.hideNavbar = [...authRoutes, ...splashRoutes].some(route => navEnd.url.startsWith(route));
      this.showAnimatedBackground = [...authRoutes, ...splashRoutes].some(route => navEnd.url.startsWith(route));
    });

    this.authService.isAuthenticated$.subscribe(
      isAuth => this.isAuthenticated = isAuth
    );

    this.authService.currentUser$.subscribe(
      user => {
        this.user = user;

      }
    );

    this.cartService.cartItems$.subscribe(
      items => this.cartItemCount = items.length
    );

    this.chatService.unreadCount$.subscribe(
      count => this.unreadCount = count
    );

    // Listen for navigation events to handle return from store
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      if (event instanceof NavigationEnd && event.url === '/virtual-street') {
        // User navigated to virtual street, trigger position check
        this.handleReturnToVirtualStreet();
      }
    });
  }

  private handleReturnToVirtualStreet(): void {
    // Small delay to ensure the virtual street component is initialized
    setTimeout(() => {
      // This will be handled by the virtual street component itself
      // The component will check for stored position on initialization
    }, 100);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasRole(role: string): boolean {
    return this.user?.roles?.includes(role) || false;
  }

  openProfileDialog() {
    const user = this.user;
    const dialogRef = this.dialog.open(ProfileDialogComponent, {
      width: '400px',
      data: {
        firstName: user?.firstName,
        lastName: user?.lastName,
        color: (user as any)?.color || '#1976d2',
        avatar: (user as any)?.avatar || 'assets/player-avatar.png'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (user) {
          this.authService.setUserColor(result.color);
          this.authService.setUserAvatar(result.avatar);
        }
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && (event.key === 'm' || event.key === 'M')) {
      if (this.isAuthenticated && !this.hasRole('Admin')) {
        // Prevent opening multiple chat dialogs
        const isChatDialogOpen = this.dialog.openDialogs.some(dialogRef => {
          // Check if the componentInstance is a ChatComponent
          return dialogRef.componentInstance instanceof ChatComponent;
        });
        if (!isChatDialogOpen) {
          const savedScrollY = window.scrollY;
          const dialogRef = this.dialog.open(ChatComponent, {
            width: '90vw',
            height: '100vh',
            maxWidth: '1200px',
            maxHeight: '100vh',
            disableClose: false
          });
          dialogRef.afterClosed().subscribe(() => {
            window.scrollTo(0, savedScrollY);
          });
        }
        event.preventDefault();
      }
    }
  }
} 