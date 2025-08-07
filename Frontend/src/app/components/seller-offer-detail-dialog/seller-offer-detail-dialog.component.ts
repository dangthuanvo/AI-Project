import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Offer } from '../my-offer/my-offer.component';
import { MatDialog } from '@angular/material/dialog';
import { MakeOfferDialogComponent } from '../make-offer-dialog/make-offer-dialog.component';
import { ImageService } from 'src/app/services/image.service';
@Component({
  selector: 'app-seller-offer-detail-dialog',
  templateUrl: './seller-offer-detail-dialog.component.html',
  styleUrls: ['./seller-offer-detail-dialog.component.scss']
})
export class SellerOfferDetailDialogComponent {
  constructor(private dialog: MatDialog, private imageService: ImageService ) {}

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }
  // ...
  getOfferStatusColor(status: string | undefined): string {
    switch (status) {
      case 'Pending': return '#ff9800'; // Amber
      case 'AcceptedBySeller':return '#4caf50'; // Green
      case 'AcceptedByCustomer': return '#4caf50'; // Green
      case 'RejectedBySeller':return '#f44336'; // Red
      case 'RejectedByCustomer': return '#f44336'; // Red
      case 'CounteredBySeller':return '#1976D2'; // Blue
      case 'CounteredByCustomer': return '#1976D2'; // Blue
      case 'Closed': return '#757575'; // Grey
      default: return '#bdbdbd';
    }
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


  getStatusLabel(status: string): string {
    switch (status) {
      case 'CounteredBySeller':
        return 'Counter Sent';
      case 'CounteredByCustomer':
        return 'Countered';
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
  @Input() offer: Offer | null = null;
  @Input() visible: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<{ action: string, counterOfferPrice?: number, note?: string }>();

  // counterOfferPrice removed; now handled by dialog

  openCounterDialog() {
    if (!this.offer || !this.offer.product || this.offer.status === 'CounterBySeller' || this.offer.status === 'RejectedBySeller' || this.offer.status === 'RejectedByCustomer') return;
    const dialogRef = this.dialog.open(MakeOfferDialogComponent, {
      width: '400px',
      data: {
        minPrice: this.offer.offeredPrice,
        maxPrice: this.offer.product.price
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.offeredPrice) {
        this.action.emit({ action: 'counter_by_seller', counterOfferPrice: result.offeredPrice, note: result.note });
      }
    });
  }

  onClose() {
    this.close.emit();
  }

  onApprove(note?: string) {
    this.action.emit({ action: 'accept_by_seller', note: note || '' });
  }

  onReject(note?: string) {
    this.action.emit({ action: 'reject_by_seller', note: note || '' });
  }


}
