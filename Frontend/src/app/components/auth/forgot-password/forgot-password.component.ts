import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  forgotPasswordLoading = false;
  forgotPasswordMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.forgotPasswordLoading = true;
      this.forgotPasswordMessage = '';
      const email = this.forgotPasswordForm.value.email;
      this.authService.forgotPassword(email).subscribe({
        next: (res: any) => {
          this.forgotPasswordLoading = false;
          this.forgotPasswordMessage = res.message || 'If the email exists, a new password has been sent.';
        },
        error: (err: any) => {
          this.forgotPasswordLoading = false;
          this.forgotPasswordMessage = err.error?.message || 'Failed to send reset email.';
        }
      });
    }
  }
} 