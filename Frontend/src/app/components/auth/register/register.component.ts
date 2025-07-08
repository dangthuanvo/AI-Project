import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, AuthResponse } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
      address: [''],
      role: ['Customer', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  passwordStrengthValidator(control: any) {
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

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const formData = this.registerForm.value;
      console.log('Register form data:', formData);
      this.authService.register(formData).subscribe({
        next: (response: AuthResponse) => {
          this.snackBar.open('Registration successful! Please login.', 'Close', {
            duration: 3000
          });
          this.authService.logout();
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Registration error:', error);
          let message = error.error?.message || 'Registration failed';
          if (error.error?.errors && Array.isArray(error.error.errors)) {
            message += '\n' + error.error.errors.map((e: any) => e.description).join('\n');
          }
          this.snackBar.open(message, 'Close', {
            duration: 6000
          });
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      console.warn('Register form invalid:', this.registerForm.value);
    }
  }
} 