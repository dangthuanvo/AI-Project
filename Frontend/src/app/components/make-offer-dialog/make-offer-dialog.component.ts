import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-make-offer-dialog',
  templateUrl: './make-offer-dialog.component.html',
  styleUrls: ['./make-offer-dialog.component.scss']
})
export class MakeOfferDialogComponent {
  offerForm: FormGroup;
  minPrice: number;
  basePrice: number;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MakeOfferDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { minPrice: number, maxPrice: number }
  ) {
    this.basePrice = data.maxPrice;
    this.minPrice = data.minPrice;
    this.offerForm = this.fb.group({
      offeredPrice: [null, [Validators.required, Validators.min(this.minPrice + 0.01), Validators.max(this.basePrice - 0.01)]],
      note: ['']
    });
  }

  submitOffer() {
    if (this.offerForm.valid) {
      this.dialogRef.close(this.offerForm.value);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
