import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.scss']
})
export class ShoppingCartComponent implements OnInit {
  cartItems: CartItem[] = [];
  subtotal = 0;
  tax = 0;
  total = 0;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private imageService: ImageService
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.cartService.getCart().subscribe(cart => {
      this.cartItems = cart.items || [];
      this.calculateTotals();
    });
  }

  updateQuantity(item: CartItem, change: number): void {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      this.cartService.updateCartItem(item.id, { quantity: newQuantity }).subscribe(() => {
        this.loadCart();
      });
    }
  }

  removeItem(item: CartItem): void {
    this.cartService.removeFromCart(item.id).subscribe(() => {
      this.snackBar.open('Item removed from cart', 'Close', { duration: 2000 });
      this.loadCart();
    });
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    this.tax = this.subtotal * 0.08; // 8% tax
    this.total = this.subtotal + this.tax;
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  clearCart(): void {
    this.cartService.clearCart().subscribe(() => {
      this.snackBar.open('Cart cleared', 'Close', { duration: 2000 });
      this.loadCart();
    });
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }
} 