import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShippingInfoService, ShippingInfo } from '../../services/shipping-info.service';

@Component({
  selector: 'app-shipping-address-dialog',
  template: `
    <h2 mat-dialog-title>Select Shipping Address</h2>
    <mat-dialog-content>
      <div *ngIf="data.shippingInfos.length === 0" class="no-address-message">
        <p>No saved addresses available.</p>
      </div>
      <div *ngFor="let info of data.shippingInfos">
        <app-shipping-address-card
          [info]="info"
          [selected]="data.selectedId === info.id"
          (select)="select(info)"
          (delete)="delete(info)"
        ></app-shipping-address-card>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `
})
export class ShippingAddressDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<ShippingAddressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { shippingInfos: ShippingInfo[], selectedId: number | null },
    private shippingInfoService: ShippingInfoService
  ) {}

  ngOnInit() {}

  select(info: ShippingInfo) {
    this.dialogRef.close(info);
  }

  delete(info: ShippingInfo) {
    this.shippingInfoService.deleteShippingInfo(info.id!).subscribe(() => {
      // Remove from local list for immediate feedback
      const idx = this.data.shippingInfos.findIndex(i => i.id === info.id);
      if (idx > -1) this.data.shippingInfos.splice(idx, 1);
    });
  }
} 