import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { ImageService } from '../../services/image.service';
import { ShowOnDirtyOrTouchedErrorStateMatcher } from './custom-error-state-matcher';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-profile-dialog',
  templateUrl: './profile-dialog.component.html',
  styleUrls: ['./profile-dialog.component.scss']
})
export class ProfileDialogComponent {
  profileForm: FormGroup;
  changePasswordForm: FormGroup;
  avatar: string;
  avatarUrl: string;
  avatarPreview: string | null = null;
  passwordChangeSuccess: string | null = null;
  passwordChangeError: string | null = null;
  isChangingPassword = false;
  errorStateMatcher = new ShowOnDirtyOrTouchedErrorStateMatcher();

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
      firstName: [data.firstName],
      lastName: [data.lastName],
      color: [data.color != null ? data.color : '#1976d2']
    });
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  save(): void {
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
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, GIF, WebP)');
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