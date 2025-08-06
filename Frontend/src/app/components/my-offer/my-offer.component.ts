import { Component, OnInit } from '@angular/core';
import { OfferService } from '../../services/offer.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MakeOfferDialogComponent } from '../make-offer-dialog/make-offer-dialog.component';

export interface Product {
  id: number;
  name: string;
  price: number;
  // Add more fields as needed
  imageUrl?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // Add more fields as needed
}

export interface Store {
  id: string;
  name: string;
  logoUrl: string;
  // Add more fields as needed
}

export interface Offer {
  offerNumber: string;
  id: number;
  productId: number;
  productName: string;
  productImageUrl?: string;
  sellerName: string;
  offeredPrice: number;
  note?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  counterOfferPrice?: number;
  counterRounds?: number;
  expiresAt?: string;
  product: Product;
  buyer: User;
  seller: User;
  store: Store;
}

@Component({
  selector: 'app-my-offer',
  templateUrl: './my-offer.component.html',
  styleUrls: ['./my-offer.component.scss']
})
export class MyOfferComponent implements OnInit {
  getOfferProgressPercentage(counterRounds: number | undefined): number {
    switch (counterRounds) {
      case 1: return 33;
      case 2: return 66;
      case 3: return 100; 
      default: return 0;
    }
  }
  offers: Offer[] = [];
  loading = false;
  currentUser: any = null;
  displayedColumns: string[] = ['product', 'seller', 'offeredPrice', 'note', 'status', 'createdAt'];

  selectedOffer: Offer | null = null;

  selectOffer(offer: Offer): void {
    this.selectedOffer = offer;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pending': return '#FFA000'; // Amber
      case 'AcceptedByCustomer': return '#43A047'; // Green
      case 'AcceptedBySeller': return '#43A047'; // Green
      case 'RejectedBySeller': return '#E53935'; // Red
      case 'RejectedByCustomer': return '#E53935'; // Red
      case 'CounteredBySeller': return '#1976D2'; // Blue
      case 'CounteredByCustomer': return '#1976D2'; // Blue
      case 'Closed': return '#757575'; // Grey
      default: return '#BDBDBD';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Pending': return 'hourglass_empty';
      case 'AcceptedByCustomer': return 'check_circle';
      case 'AcceptedBySeller': return 'check_circle';
      case 'RejectedBySeller':return 'cancel';
      case 'RejectedByCustomer': return 'cancel';
      case 'CounteredBySeller':return 'sync_alt';
      case 'CounteredByCustomer': return 'sync_alt';
      case 'Closed': return 'block';
      default: return 'help_outline';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'CounteredBySeller':
        return 'Countered';
      case 'CounteredByCustomer':
        return 'Counter Sent';
      case 'RejectedBySeller':
        return 'Rejected';
      case 'RejectedByCustomer':
        return 'Rejected';
      case 'AcceptedBySeller':
        return 'Accepted';
      case 'AcceptedByCustomer':
        return 'Accepted';
      case 'Closed':
        return 'Closed';
      default:
        return status;
    }
  }

  constructor(
    private offerService: OfferService,
    private authService: AuthService,
    public imageService: ImageService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadOffers();
      }
    });
  }

  loadOffers(): void {
    this.loading = true;
    this.offerService.getMyOffers().subscribe({
      next: (offers) => {
        this.offers = offers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.loading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getProductImageUrl(offer: Offer): string {
    if (offer.productImageUrl) {
      return this.imageService.getImageUrl(offer.product.imageUrl);
    }
    return this.imageService.getPlaceholderUrl();
  }

  acceptCounter(offer: Offer): void {
    this.offerService.respondToOffer(offer.id, 'accept_by_customer').subscribe({
      next: () => this.loadOffers(),
      error: err => this.snackBar.open('Failed to accept counter offer', 'Close', { duration: 3000 })
    });
  }

  openCounterDialog(offer: Offer): void {
    let minPrice = offer.offeredPrice;
    let maxPrice = offer.product.price;
    // If countering a seller's counter, restrict between offered and countered price
    if (offer.status === 'CounteredBySeller' && offer.counterOfferPrice) {
      minPrice = Math.min(offer.offeredPrice, offer.counterOfferPrice);
      maxPrice = Math.max(offer.offeredPrice, offer.counterOfferPrice);
    }
    const dialogRef = this.dialog.open(MakeOfferDialogComponent, {
      width: '400px',
      data: { minPrice, maxPrice }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.offeredPrice) {
        this.offerService.respondToOffer(offer.id, 'counter_by_customer', result.offeredPrice).subscribe({
          next: () => {
            // If offer is CounteredByCustomer, do not refresh detail
            if (this.selectedOffer && this.selectedOffer.status === 'CounteredByCustomer') {
              // Optionally, show a message or just close dialog
            } else {
              this.loadOffers();
            }
          },
          error: err => this.snackBar.open('Failed to send counter offer', 'Close', { duration: 3000 })
        });
      }
    });
  }

  rejectCounterOffer(offer: Offer): void {
    this.offerService.respondToOffer(offer.id, 'reject_by_customer').subscribe({
      next: () => this.loadOffers(),
      error: err => this.snackBar.open('Failed to reject offer', 'Close', { duration: 3000 })
    });
  }
}
