import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { MatDialog } from '@angular/material/dialog';
import { RatingDialogComponent } from '../rating-dialog/rating-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RatingService } from '../../services/rating.service';

export interface Order {
  id: number;
  orderNumber: string;
  orderDate: string;
  status: 'Pending' | 'Accepted' | 'Shipped' | 'Delivered';
  totalAmount: number;
  items: OrderItem[];
  shippingAddress: string;
  trackingNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  payPalOrderId?: string;
  payPalTransactionId?: string;
  payPalPaymentId?: string;
  shippedDate?: string;
  deliveredDate?: string;
  userId: string;
  userVoucher?: {
    code: string;
    discountPercent: number;
  };
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  productName: string;
  productImageUrl?: string;
  product?: Product;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  storeId: number;
  productImages: ProductImage[];
}

export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
}

@Component({
  selector: 'app-order-tracking',
  templateUrl: './order-tracking.component.html',
  styleUrls: ['./order-tracking.component.scss']
})
export class OrderTrackingComponent implements OnInit {
  // ...existing code...
  getOrderTax(order: Order): number {
    if (!order || !order.items) return 0;
    const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return Math.round(subtotal * 0.08 * 100) / 100;
  }
  orders: Order[] = [];
  loading = false;
  selectedOrder: Order | null = null;
  currentUser: any = null;

  // Track reviewed items: key = productId + '-' + orderId
  reviewedItems: { [key: string]: boolean } = {};

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    public imageService: ImageService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private ratingService: RatingService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadOrders();
      }
    });
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      }
    });
  }

  selectOrder(order: Order): void {
    this.selectedOrder = order;
    this.fetchReviewedItems(order);
  }

  fetchReviewedItems(order: Order): void {
    this.reviewedItems = {};
    if (!order || !order.items) return;
    order.items.forEach(item => {
      this.ratingService.getMyRatingForProductInOrder(item.productId, order.id).subscribe(rating => {
        const key = `${item.productId}-${order.id}`;
        this.reviewedItems[key] = !!rating;
      });
    });
  }

  isItemReviewed(item: OrderItem, orderId: number): boolean {
    const key = `${item.productId}-${orderId}`;
    return !!this.reviewedItems[key];
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pending': return '#FFA726';
      case 'Accepted': return '#42A5F5';
      case 'Shipped': return '#7E57C2';
      case 'Delivered': return '#66BB6A';
      default: return '#757575';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Pending': return 'schedule';
      case 'Accepted': return 'check_circle_outline';
      case 'Shipped': return 'local_shipping';
      case 'Delivered': return 'check_circle';
      default: return 'help';
    }
  }

  getProgressPercentage(status: string): number {
    switch (status) {
      case 'Pending': return 25;
      case 'Accepted': return 50;
      case 'Shipped': return 75;
      case 'Delivered': return 100;
      default: return 0;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    
    // Convert to GMT+7 (Vietnam timezone)
    const vietnamOffset = 7 * 60; // 7 hours in minutes
    const localOffset = date.getTimezoneOffset();
    const totalOffset = vietnamOffset + localOffset;
    
    const vietnamDate = new Date(date.getTime() + (totalOffset * 60 * 1000));
    
    return vietnamDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstimatedDelivery(orderDate: string): string {
    const orderDateObj = new Date(orderDate);
    const estimatedDate = new Date(orderDateObj);
    estimatedDate.setDate(estimatedDate.getDate() + 3);
    return this.formatDate(estimatedDate.toISOString());
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getProductImageUrl(item: OrderItem): string {
    // First try to get image from the stored ProductImageUrl
    if (item.productImageUrl) {
      return this.imageService.getImageUrl(item.productImageUrl);
    }
    
    // Then try to get from the product's images
    if (item.product && item.product.productImages && item.product.productImages.length > 0) {
      return this.imageService.getImageUrl(item.product.productImages[0].imageUrl);
    }
    
    // Fallback to placeholder
    return this.imageService.getPlaceholderUrl();
  }

  openRatingDialog(item: OrderItem): void {
    if (!this.selectedOrder) return;
    const dialogRef = this.dialog.open(RatingDialogComponent, {
      width: '400px',
      data: {
        productId: item.productId,
        orderId: this.selectedOrder.id,
        productName: item.productName
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submitRating(result);
      }
    });
  }

  submitRating(ratingData: any): void {
    this.orderService.submitProductRating(ratingData).subscribe({
      next: () => {
        this.snackBar.open('Thank you for your rating!', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open('Failed to submit rating. Please try again.', 'Close', { duration: 4000 });
      }
    });
  }
} 