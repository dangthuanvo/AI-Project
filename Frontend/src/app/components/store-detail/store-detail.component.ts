import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService, Store, Product } from '../../services/store.service';
import { ImageService } from '../../services/image.service';
import { AuthService } from '../../services/auth.service';
import { AnimationService } from '../services/animation.service';

@Component({
  selector: 'app-store-detail',
  templateUrl: './store-detail.component.html',
  styleUrls: ['./store-detail.component.scss']
})
export class StoreDetailComponent implements OnInit {
  store: Store | null = null;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  sortOrder = 'none';
  firstAppear: boolean[] = [];
  flyDirections: string[] = [];

  constructor(
    private route: ActivatedRoute, 
    private storeService: StoreService, 
    private imageService: ImageService, 
    private router: Router,
    private authService: AuthService,
    private animationService: AnimationService // <-- Injected
  ) {}

  ngOnInit(): void {
    const storeIdParam = this.route.snapshot.paramMap.get('id');
    const storeId = storeIdParam ? Number(storeIdParam) : null;
    if (storeId) {
      this.loading = true;
      this.storeService.getStore(storeId).subscribe({
        next: (store: Store) => {
          this.store = store;
          this.loadProducts(storeId);
        },
        error: () => {
          this.error = 'Không thể tải thông tin cửa hàng.';
          this.loading = false;
        }
      });
    } else {
      this.error = 'Không tìm thấy cửa hàng.';
      this.loading = false;
    }
  }

  private getRandomDirection(): string {
    const directions = ['left', 'right', 'top', 'bottom'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  loadProducts(storeId: number): void {
    this.storeService.getStoreProducts(storeId).subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.firstAppear = products.map(() => true);
        this.flyDirections = products.map(() => this.getRandomDirection());
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.error = 'Failed to load products';
        this.loading = false;
      }
    });
  }

  onSearchInput(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.sortOrder = 'none';
    this.filteredProducts = this.products;
  }

  applyFilters(): void {
    let filtered = this.products;

    // Apply search filter (by name only)
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (this.sortOrder !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (this.sortOrder === 'low-to-high') {
          return a.price - b.price;
        } else if (this.sortOrder === 'high-to-low') {
          return b.price - a.price;
        }
        return 0;
      });
    }

    this.filteredProducts = filtered;
    this.firstAppear = filtered.map(() => true);
    this.flyDirections = filtered.map(() => this.getRandomDirection());
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }

  navigateToProduct(productId: number, event?: MouseEvent): void {
    if (event) {
      // Find the image element that was clicked
      const card = (event.currentTarget as HTMLElement);
      const img = card.querySelector('img');
      if (img) {
        const rect = img.getBoundingClientRect();
        this.animationService.setFlyImageState({
          productId,
          imageUrl: img.src,
          rect
        });
      }
    }
    this.router.navigate(['/product', productId]);
  }

  goBackToVirtualStreet(): void {
    this.router.navigate(['/virtual-street']);
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  onChatInitiated(): void {
    // Handle chat initiation if needed
    console.log('Chat initiated with store:', this.store?.name);
  }
} 