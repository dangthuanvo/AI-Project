import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { ImageService } from '../../services/image.service';
import { ShowOnDirtyOrTouchedErrorStateMatcher, DisableOnSuccessErrorStateMatcher } from './custom-error-state-matcher';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-profile-dialog',
  templateUrl: './profile-dialog.component.html',
  styleUrls: ['./profile-dialog.component.scss']
})
export class ProfileDialogComponent {
  // Helper to convert base64 dataURL to File
  dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new File([u8arr], filename, { type: mime });
  }

  cameraActive = false;
  mediaStream: MediaStream | null = null;
  videoElem!: HTMLVideoElement;

  hideCurrentPassword: boolean = true;
  hideNewPassword: boolean = true;
  hideConfirmNewPassword: boolean = true;
  profileForm: FormGroup;
  changePasswordForm: FormGroup;
  avatar: string;
  avatarUrl: string;
  avatarPreview: string | null = null;
  passwordChangeSuccess: string | null = null;
  passwordChangeError: string | null = null;
  isChangingPassword = false;
  errorStateMatcher = new ShowOnDirtyOrTouchedErrorStateMatcher();
  passwordFieldMatcher = new DisableOnSuccessErrorStateMatcher(() => !!this.passwordChangeSuccess);

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProfileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
    public imageService: ImageService,
    private cdr: ChangeDetectorRef
  ) {
    this.avatar = (data && data.avatar) ? data.avatar : '/uploads/images/user-avatar.png';
    if (!this.avatar || this.avatar === 'null' || this.avatar === 'undefined' || this.avatar === '/user-avatar.png' || this.avatar === 'user-avatar.png') {
      this.avatar = '/uploads/images/user-avatar.png';
    }
    console.log('Avatar value:', this.avatar);
    this.avatarUrl = this.imageService.getImageUrl(this.avatar);
    this.profileForm = this.fb.group({
      firstName: [data.firstName, Validators.required],
      lastName: [data.lastName, Validators.required],
      color: [data.color != null ? data.color : '#1976d2']
    });
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  toggleCamera(): void {
    if (this.cameraActive) {
      this.stopCamera();
      this.cameraActive = false;
      return;
    }
    this.cameraActive = true;
    setTimeout(() => {
      // Find the video element rendered by *ngIf
      const video = document.querySelector('video.avatar-video') as HTMLVideoElement;
      if (video) {
        this.videoElem = video;
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            this.mediaStream = stream;
            video.srcObject = stream;
            video.play();
          })
          .catch(() => {
            alert('Unable to access camera.');
            this.cameraActive = false;
          });
      }
    }, 100);
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
  }

  captureFromCamera(): void {
    if (!this.videoElem) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElem.videoWidth;
    canvas.height = this.videoElem.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.videoElem, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      this.avatarPreview = dataUrl;
      // Convert base64 dataUrl to File
      const file = this.dataURLtoFile(dataUrl, 'avatar.png');
      // Upload the captured image file to backend
      this.fileUploadService.uploadImage(file).subscribe({
        next: (imageUrl: string) => {
          this.avatar = imageUrl;
          this.avatarUrl = this.imageService.getImageUrl(this.avatar);
          this.avatarPreview = null;
          // Immediately update profile so virtual street updates right away
          this.authService.updateProfile({
            firstName: this.profileForm.value.firstName,
            lastName: this.profileForm.value.lastName,
            color: this.profileForm.value.color,
            avatar: imageUrl
          }).subscribe();
        },
        error: () => {
          alert('Error uploading captured image.');
        }
      });
    }
    this.stopCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  save(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const profileData = { ...this.profileForm.value, avatar: this.avatar };
    this.authService.updateProfile(profileData).subscribe({
      next: (updated) => {
        this.dialogRef.close(profileData);
      },
      error: () => {
        // Optionally show an error message
        this.dialogRef.close(profileData);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onAvatarUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'image/jfif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon'
      ];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, JPEG, PNG, GIF, WebP, JFIF, BMP, TIFF, SVG, ICO)');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Maximum size is 5MB.');
        return;
      }
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
      // Upload
      this.fileUploadService.uploadImage(file).subscribe({
        next: (imageUrl: string) => {
          this.avatar = imageUrl;
          this.avatarUrl = this.imageService.getImageUrl(this.avatar);
          // Send all profile fields to backend
          this.authService.updateProfile({
            firstName: this.profileForm.value.firstName,
            lastName: this.profileForm.value.lastName,
            color: this.profileForm.value.color,
            avatar: imageUrl
          }).subscribe();
        },
        error: (err) => {
          alert('Error uploading avatar.');
        }
      });
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  changePassword(): void {
    this.passwordChangeSuccess = null;
    this.passwordChangeError = null;
    if (this.changePasswordForm.invalid) {
      this.passwordChangeError = 'Please fill all fields correctly.';
      return;
    }
    const { currentPassword, newPassword, confirmNewPassword } = this.changePasswordForm.value;
    if (newPassword !== confirmNewPassword) {
      this.passwordChangeError = 'New passwords do not match.';
      return;
    }
    this.isChangingPassword = true;
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.passwordChangeSuccess = 'Password changed successfully.';
        this.changePasswordForm.reset();
        // Mark form and all controls as pristine and untouched
        this.changePasswordForm.markAsPristine();
        this.changePasswordForm.markAsUntouched();
        Object.values(this.changePasswordForm.controls).forEach(control => {
          control.markAsPristine();
          control.markAsUntouched();
          control.updateValueAndValidity();
        });
        this.changePasswordForm.updateValueAndValidity();
        // Force error state matcher to re-evaluate
        this.errorStateMatcher = new ShowOnDirtyOrTouchedErrorStateMatcher();
        this.passwordFieldMatcher = new DisableOnSuccessErrorStateMatcher(() => !!this.passwordChangeSuccess);
        // Remove focus from all fields to avoid accidental error display
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        this.cdr.detectChanges();
        this.isChangingPassword = false;
      },
      error: (err) => {
        this.passwordChangeError = err?.error?.message || 'Password change failed.';
        this.isChangingPassword = false;
      }
    });
  }

  passwordStrengthValidator(control: AbstractControl) {
    const password = control.value;
    if (!password) return null;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNonAlpha = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper) {
      return { passwordRequiresUpper: true };
    }
    if (!hasLower) {
      return { passwordRequiresLower: true };
    }
    if (!hasNonAlpha) {
      return { passwordRequiresNonAlphanumeric: true };
    }
    return null;
  }

  // Validator to ensure newPassword and confirmNewPassword match
  passwordsMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmNewPassword = form.get('confirmNewPassword');
    if (newPassword && confirmNewPassword && newPassword.value !== confirmNewPassword.value) {
      confirmNewPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }
} 