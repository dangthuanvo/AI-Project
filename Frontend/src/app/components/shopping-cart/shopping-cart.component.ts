import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { StoreService } from '../../services/store.service';
import { OfferService } from '../../services/offer.service';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.scss']
})
export class ShoppingCartComponent implements OnInit {
  cartItems: CartItem[] = [];
  groupedCartItems: { [storeId: number]: { storeName: string, items: CartItem[] } } = {};
  storeLogos: { [storeId: number]: string } = {};
  subtotal = 0;
  tax = 0;
  total = 0;
  itemStock: { [productId: number]: number } = {};
  activeOffers: { [productId: number]: any } = {}; // Offer lookup by productId


  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private imageService: ImageService,
    private storeService: StoreService,
    private offerService: OfferService
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    // Fetch offers first
    this.activeOffers = {};
    this.cartService.getCart().subscribe(cart => {
      this.cartItems = cart.items || [];
      this.offerService.getMyOffers().subscribe((offers: any[]) => {
        // Build lookup of active offers
        offers.forEach((offer: any) => {
          if (
            (offer.status === 'AcceptedByCustomer' || offer.status === 'AcceptedBySeller') &&
            offer.productId != null
          ) {
            this.activeOffers[offer.productId] = offer;
          }
        });
        // Enforce quantity and price for cart items with active offer
        this.cartItems.forEach(item => {
          const offer = this.activeOffers[item.productId];
          if (offer) {
            item.quantity = 1;
            item.unitPrice = offer.status === 'AcceptedByCustomer' ? offer.counterOfferPrice : offer.offeredPrice;
            item.totalPrice = item.unitPrice;
          }
        });
        // Group items by store
        this.groupedCartItems = {};
        const storeIds: Set<number> = new Set();
        this.cartItems.forEach(item => {
          if (!this.groupedCartItems[item.storeId]) {
            this.groupedCartItems[item.storeId] = { storeName: item.storeName, items: [] };
          }
          this.groupedCartItems[item.storeId].items.push(item);
          storeIds.add(item.storeId);
        });
        // Fetch store logos for each store
        storeIds.forEach(storeId => {
          this.storeService.getStore(storeId).subscribe(store => {
            this.storeLogos[storeId] = store.logoUrl || '';
          });
        });
        // Fetch stock for each item
        this.cartItems.forEach(item => {
          this.storeService.getProduct(item.productId).subscribe(product => {
            this.itemStock[item.productId] = product.stockQuantity;
          });
        });
        this.calculateTotals();
      });
    });
  }

  updateQuantity(item: CartItem, change: number): void {
    // Prevent quantity change if item has active offer
    if (this.activeOffers[item.productId]) {
      this.snackBar.open('Quantity cannot be changed for items with an accepted offer.', 'Close', { duration: 3000 });
      return;
    }
    const maxStock = this.itemStock[item.productId] ?? 99;
    const newQuantity = item.quantity + change;
    if (newQuantity > 0 && newQuantity <= maxStock) {
      this.cartService.updateCartItem(item.id, { quantity: newQuantity }).subscribe(() => {
        this.loadCart();
      });
    } else if (newQuantity > maxStock) {
      this.snackBar.open('Not enough stock for this product', 'Close', { duration: 2000 });
    }
  }

  onQuantityInputChange(item: CartItem): void {
    // Prevent manual input if item has active offer
    if (this.activeOffers[item.productId]) {
      this.snackBar.open('Quantity cannot be changed for items with an accepted offer.', 'Close', { duration: 3000 });
      return;
    }
    const maxStock = this.itemStock[item.productId] ?? 99;
    if (item.quantity < 1) {
      item.quantity = 1;
    } else if (item.quantity > maxStock) {
      item.quantity = maxStock;
      this.snackBar.open('Not enough stock for this product', 'Close', { duration: 2000 });
    }
    this.cartService.updateCartItem(item.id, { quantity: item.quantity }).subscribe(() => {
      this.loadCart();
    });
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

  onStoreLogoError(storeId: number): void {
    this.storeLogos[storeId] = '/uploads/images/user-avatar.png';
  }
} 