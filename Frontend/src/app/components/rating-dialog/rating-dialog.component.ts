import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploadService } from '../../services/file-upload.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSpinner } from '@angular/material/progress-spinner';

export interface RatingDialogData {
  productId: number;
  orderId: number;
  productName: string;
}

@Component({
  selector: 'app-rating-dialog',
  templateUrl: './rating-dialog.component.html',
  styleUrls: ['./rating-dialog.component.scss']
})
export class RatingDialogComponent {
  ratingForm: FormGroup;
  uploading = false;
  uploadError: string | null = null;
  imageUrl: string | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RatingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RatingDialogData,
    private fb: FormBuilder,
    private fileUploadService: FileUploadService
  ) {
    this.ratingForm = this.fb.group({
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.maxLength(2000)]],
      image: [null]
    });
  }

  onFileButtonClick(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'image/jfif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon'
      ];
      if (!allowedTypes.includes(file.type)) {
        this.uploadError = 'Please select a valid image file (JPG, JPEG, PNG, GIF, WebP, JFIF, BMP, TIFF, SVG, ICO)';
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.uploadError = 'File size too large. Maximum size is 5MB.';
        return;
      }
      this.selectedFile = file;
      this.uploadError = null;
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.imageUrl = null;
  }

  async submit(): Promise<void> {
    if (this.ratingForm.valid) {
      let imageUrl = this.imageUrl;
      if (this.selectedFile) {
        this.uploading = true;
        try {
          const uploadedUrl = await this.fileUploadService.uploadImage(this.selectedFile).toPromise();
          imageUrl = uploadedUrl ?? null;
          this.uploading = false;
        } catch (err) {
          this.uploadError = 'Image upload failed.';
          this.uploading = false;
          return;
        }
      }
      this.dialogRef.close({
        productId: this.data.productId,
        orderId: this.data.orderId,
        rating: this.ratingForm.value.rating,
        comment: this.ratingForm.value.comment,
        imageUrl: imageUrl
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
} 