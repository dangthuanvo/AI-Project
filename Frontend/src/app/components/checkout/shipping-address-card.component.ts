import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ShippingInfo } from '../../services/shipping-info.service';

@Component({
  selector: 'app-shipping-address-card',
  template: `
    <mat-card class="address-card" [class.selected]="selected" (click)="select.emit()">
      <div>
        <strong>{{ info.firstName }} {{ info.lastName }}</strong><br>
        {{ info.address }}, {{ info.city }}, {{ info.state }}, {{ info.zipCode }}, {{ info.country }}<br>
        {{ info.phone }} | {{ info.email }}
      </div>
      <div class="address-actions">
        <button mat-icon-button color="warn" (click)="delete.emit(); $event.stopPropagation();">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </mat-card>
  `,
  styleUrls: ['./shipping-address-card.component.scss']
})
export class ShippingAddressCardComponent {
  @Input() info!: ShippingInfo;
  @Input() selected = false;
  @Output() select = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
} 