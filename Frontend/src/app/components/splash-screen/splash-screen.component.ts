import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss']
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  currentStep = 0;
  progress = 0;
  userName = '';
  userRole = '';
  isLoading = true;
  showWelcome = false;
  showFeatures = false;
  showLoading = false;
  showEnterButton = false;
  
  private interval: any;
  private stepInterval: any;

  features = [
    {
      icon: 'store',
      title: 'Virtual Shopping Street',
      description: 'Explore a vibrant 3D virtual street with multiple stores and interactive shopping experience'
    },
    {
      icon: 'shopping_cart',
      title: 'Smart Shopping Cart',
      description: 'Add products to your cart and enjoy seamless checkout with PayPal integration'
    },
    {
      icon: 'chat',
      title: 'Real-time Chat',
      description: 'Connect with other shoppers and store owners through our live chat system'
    },
    {
      icon: 'sports_esports',
      title: 'Fun Minigames',
      description: 'Take a break and enjoy various minigames while shopping'
    },
    {
      icon: 'location_on',
      title: 'Global Search',
      description: 'Find products and stores instantly with our powerful search functionality'
    },
    {
      icon: 'nightlight',
      title: 'Day/Night Mode',
      description: 'Experience the virtual street in both day and night modes'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.initializeSplash();
    setInterval(() => {
      // Debug: log the state of the flags
      // Remove this in production
      console.log('Splash flags:', {
        showWelcome: this.showWelcome,
        showFeatures: this.showFeatures,
        showLoading: this.showLoading,
        showEnterButton: this.showEnterButton
      });
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
    }
  }

  private initializeSplash(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = `${user.firstName} ${user.lastName}`.trim() || user.email || 'User';
      this.userRole = user.roles?.includes('Admin') ? 'Admin' : 
                     user.roles?.includes('Seller') ? 'Seller' : 'Customer';
    }

    // Start the splash sequence
    setTimeout(() => {
      this.showWelcome = true;
      // this.startProgress(); // Remove from here
    }, 500);

    // Show features after welcome and hide welcome
    setTimeout(() => {
      this.showWelcome = false;
      setTimeout(() => {
        this.showFeatures = true;
        this.startFeatureAnimation();
      }, 500); // Wait for welcome fade out
    }, 4000);

    // Show loading after features and hide features
    setTimeout(() => {
      this.showFeatures = false;
      setTimeout(() => {
        this.showLoading = true;
        this.startProgress(); // Start progress bar here
      }, 500); // Wait for features fade out
    }, 9000); // or your current timing

    // Show enter button after loading and hide loading
    setTimeout(() => {
      this.showLoading = false;
      setTimeout(() => {
        this.showEnterButton = true;
        this.isLoading = false;
      }, 500); // Wait for loading fade out
    }, 11000); // was 10000, now 11000 for 1s longer
  }

  private startProgress(): void {
    this.progress = 0;
    this.interval = setInterval(() => {
      this.progress += 1;
      if (this.progress >= 100) {
        clearInterval(this.interval);
      }
    }, 20); // 2 seconds total
  }

  private startFeatureAnimation(): void {
    this.stepInterval = setInterval(() => {
      this.currentStep++;
      if (this.currentStep >= this.features.length) {
        clearInterval(this.stepInterval);
      }
    }, 800); // Show each feature for 800ms
  }

  enterVirtualStreet(): void {
    // Navigate to virtual street
    this.router.navigate(['/virtual-street']);
  }

  skipSplash(): void {
    // Skip splash and go directly to virtual street
    this.router.navigate(['/virtual-street']);
  }
} 