import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { StoreService, Product } from '../../services/store.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../../services/chat.service';
import { HttpClient } from '@angular/common/http';
import { RatingService } from '../../services/rating.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  error: string | null = null;
  addToCartForm: FormGroup;
  currentUser: any;
  selectedImageIndex = 0;
  
  // Full-screen viewer properties
  isFullScreenOpen = false;
  fullScreenImageIndex = 0;
  ratings: any[] = [];
  averageRating: number | null = null;

  // Paging for ratings
  ratingsPerPage = 5;
  currentRatingsPage = 1;
  get totalRatingsPages(): number {
    return Math.ceil(this.ratings.length / this.ratingsPerPage) || 1;
  }
  get pagedRatings(): any[] {
    const start = (this.currentRatingsPage - 1) * this.ratingsPerPage;
    return this.ratings.slice(start, start + this.ratingsPerPage);
  }

  setRatingsPage(page: number): void {
    if (page < 1 || page > this.totalRatingsPages) return;
    this.currentRatingsPage = page;
  }

  // Rating image fullscreen properties
  isRatingImageFullScreen = false;
  ratingImageFullScreenUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private cartService: CartService,
    private authService: AuthService,
    private imageService: ImageService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private chatService: ChatService,
    private http: HttpClient,
    private ratingService: RatingService
  ) {
    this.addToCartForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProduct();
  }

  loadProduct(): void {
    const productId = Number(this.route.snapshot.paramMap.get('id'));
    if (!productId) {
      this.error = 'Product ID is required';
      this.loading = false;
      return;
    }

    this.storeService.getProduct(productId).subscribe({
      next: (product) => {
        this.product = product;
        this.loading = false;
        this.loadRatings(product.id);
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error = 'Failed to load product';
        this.loading = false;
      }
    });
  }

  loadRatings(productId: number): void {
    this.ratingService.getProductRatings(productId).subscribe({
      next: (ratings) => {
        this.ratings = ratings;
        this.calculateAverageRating();
        this.currentRatingsPage = 1;
      },
      error: (err) => {
        this.ratings = [];
        this.averageRating = null;
        this.currentRatingsPage = 1;
      }
    });
  }

  calculateAverageRating(): void {
    if (!this.ratings || this.ratings.length === 0) {
      this.averageRating = null;
      return;
    }
    const sum = this.ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
    this.averageRating = +(sum / this.ratings.length).toFixed(1);
  }

  // Full-screen viewer methods
  openFullScreenViewer(): void {
    this.isFullScreenOpen = true;
    this.fullScreenImageIndex = this.selectedImageIndex;
    // Prevent body scroll when fullscreen is open
    document.body.style.overflow = 'hidden';
  }

  closeFullScreenViewer(): void {
    this.isFullScreenOpen = false;
    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Rating image fullscreen methods
  openRatingImageFullScreen(url: string): void {
    this.isRatingImageFullScreen = true;
    this.ratingImageFullScreenUrl = url;
    document.body.style.overflow = 'hidden';
  }

  closeRatingImageFullScreen(): void {
    this.isRatingImageFullScreen = false;
    this.ratingImageFullScreenUrl = null;
    document.body.style.overflow = '';
  }

  navigateFullScreen(direction: number): void {
    const images = this.getGalleryImages();
    if (images.length > 1) {
      this.fullScreenImageIndex = (this.fullScreenImageIndex + direction + images.length) % images.length;
    }
  }

  // Handle keyboard events for full-screen navigation
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isFullScreenOpen) return;
    
    switch (event.key) {
      case 'Escape':
        this.closeFullScreenViewer();
        break;
      case 'ArrowLeft':
        this.navigateFullScreen(-1);
        break;
      case 'ArrowRight':
        this.navigateFullScreen(1);
        break;
    }
  }

  addToCart(): void {
    if (!this.product || this.addToCartForm.invalid) {
      this.snackBar.open('Please select a valid quantity', 'Close', { duration: 3000 });
      return;
    }

    const quantity = this.addToCartForm.get('quantity')?.value;
    
    if (quantity > this.product.stockQuantity) {
      this.snackBar.open('Quantity exceeds available stock', 'Close', { duration: 3000 });
      return;
    }

    this.cartService.addToCart({
      productId: this.product.id,
      quantity: quantity
    }).subscribe({
      next: () => {
        this.snackBar.open('Product added to cart successfully!', 'Close', { duration: 3000 });
        this.addToCartForm.reset({ quantity: 1 });
      },
      error: (error: any) => {
        console.error('Error adding to cart:', error);
        let errorMessage = 'Failed to add product to cart';
        
        if (error.status === 403) {
          // Handle Forbid responses
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  getImageUrl(imageUrl?: string | null): string {
    if (imageUrl !== undefined) {
      return this.imageService.getImageUrl(imageUrl);
    }
    return this.product?.imageUrls && this.product.imageUrls.length > 0 ? this.imageService.getImageUrl(this.product.imageUrls[0]) : '';
  }

  getGalleryImages(): string[] {
    return this.product?.imageUrls || [];
  }

  isSeller(): boolean {
    return this.authService.hasRole('Seller');
  }

  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }

  isCustomer(): boolean {
    return this.authService.hasRole('Customer');
  }

  canAddToCart(): boolean {
    // Only customers can add to cart
    if (!this.isCustomer()) {
      return false;
    }

    // Sellers cannot add their own products to cart
    if (this.isSeller() && this.product?.storeId) {
      // For now, sellers cannot add any products to cart
      // In a full implementation, you would check if the current user owns this store
      return false;
    }

    return true;
  }

  isOwnProduct(): boolean {
    // Check if the current user is the seller of this product
    if (!this.isSeller() || !this.product?.storeId) {
      return false;
    }
    
    // For now, we'll assume sellers cannot add any products to cart
    // In a full implementation, you would check if the current user owns the store
    return true;
  }

  editProduct(): void {
    if (this.product) {
      this.router.navigate(['/seller/dashboard'], { 
        queryParams: { 
          editProduct: this.product.id,
          tab: 'products'
        }
      });
    }
  }

  goToStore(): void {
    if (this.product) {
      this.router.navigate(['/store', this.product.storeId]);
    }
  }

  goBackToVirtualStreet(): void {
    this.router.navigate(['/virtual-street']);
  }

  onImageError(index: number) {
    if (this.product && this.product.imageUrls) {
      this.product.imageUrls.splice(index, 1);
      if (this.selectedImageIndex >= this.product.imageUrls.length) {
        this.selectedImageIndex = 0;
      }
    }
  }

  openChatWithSeller(): void {
    if (!this.product) return;

    // Get store information first
    this.storeService.getStore(this.product.storeId).subscribe({
      next: (store) => {
        const savedScrollY = window.scrollY;
        // Open chat in a dialog
        const dialogRef = this.dialog.open(ChatComponent, {
          width: '90vw',
          height: '100vh',
          maxWidth: '1200px',
          maxHeight: '100vh',
          disableClose: false,
          data: {
            storeId: this.product!.storeId,
            storeName: store.name,
            sellerId: store.ownerId,
            sellerName: store.ownerName,
            productId: this.product!.id,
            productName: this.product!.name
          }
        });

        dialogRef.afterOpened().subscribe(() => {
          this.chatService.waitForConnection().then(() => {
            this.chatService.getMessages(store.ownerId, this.product!.storeId, 1, 1).subscribe(messages => {
              const productMsg = `[PRODUCT:${this.product!.id}]`;
              const isFirstTimeChat = !messages || messages.length === 0;
              const latest = messages && messages.length > 0 ? messages[messages.length - 1] : null;
              if (!latest || latest.content !== productMsg) {
                this.chatService.sendMessage({
                  receiverId: store.ownerId,
                  content: productMsg,
                  storeId: this.product!.storeId
                }).then(() => {
                  if (isFirstTimeChat) {
                    // Optimistically add the product card message to the UI ONLY for first-time chat
                    const now = new Date();
                    this.chatService.addMessageToConversation({
                      id: -1, // Temporary ID, will be replaced by backend
                      senderId: this.authService.getCurrentUser()?.id || '',
                      senderName: ((this.authService.getCurrentUser()?.firstName || '') + ' ' + (this.authService.getCurrentUser()?.lastName || '')).trim(),
                      senderAvatar: this.authService.getCurrentUser()?.avatar || '',
                      receiverId: store.ownerId,
                      receiverName: store.ownerName,
                      content: productMsg,
                      sentAt: now,
                      isRead: false,
                      storeId: this.product!.storeId,
                      storeName: store.name
                    });
                  }
                });
              }
            });
          });
        });

        dialogRef.afterClosed().subscribe(() => {
          window.scrollTo(0, savedScrollY);
          // Handle dialog close if needed
        });
      },
      error: (error) => {
        console.error('Error loading store information:', error);
        this.snackBar.open('Failed to load store information', 'Close', { duration: 3000 });
      }
    });
  }

  onChatInitiated(): void {
    // Handle chat initiation if needed
    console.log('Chat initiated for product:', this.product?.name);
  }
} 