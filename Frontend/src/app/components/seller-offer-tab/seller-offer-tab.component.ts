import { Component, Input, OnInit } from '@angular/core';
import { OfferService } from '../../services/offer.service';
import { Offer } from '../my-offer/my-offer.component';

@Component({
  selector: 'app-seller-offer-tab',
  templateUrl: './seller-offer-tab.component.html',
  styleUrls: ['./seller-offer-tab.component.scss']
})
export class SellerOfferTabComponent implements OnInit {
  @Input() storeId!: number;
  offers: Offer[] = [];
  loading = false;
  showOfferDetail = false;
  selectedOffer: Offer | null = null;

  constructor(private offerService: OfferService) {}

  ngOnInit(): void {
    if (this.storeId) {
      this.loadOffers();
    }
  }

  loadOffers(): void {
    this.loading = true;
    this.offerService.getOffersForSeller().subscribe({
      next: (offers: Offer[]) => {
        this.offers = offers;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading offers:', error);
        this.loading = false;
      }
    });
  }

  getOfferStatusColor(status: string): string {
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

  viewOfferDetails(offer: Offer): void {
    this.selectedOffer = offer;
    this.showOfferDetail = true;
  }

  handleOfferDialogClose(): void {
    this.showOfferDetail = false;
    this.selectedOffer = null;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'AcceptedByCustomer':
        return 'Accepted';
      case 'AcceptedBySeller':
        return 'Accepted';
      case 'CounteredBySeller':
        return 'Counter Sent';
      case 'CounteredByCustomer':
        return 'Countered';
      case 'RejectedBySeller':
        return 'Rejected';
      case 'RejectedByCustomer':
        return 'Rejected';
      case 'Closed':
        return 'Closed';
      default:
        return status;
    }
  }

  handleOfferAction(event: { action: string, counterOfferPrice?: number }): void {
    if (!this.selectedOffer) return;
    this.offerService.respondToOffer(this.selectedOffer.id, event.action, event.counterOfferPrice).subscribe({
      next: () => {
        this.loadOffers();
        this.handleOfferDialogClose();
      },
      error: (error: any) => {
        console.error('Error updating offer:', error);
      }
    });
  }
}

