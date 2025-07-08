import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CartService, CartItem, CheckoutRequest, CheckoutResponse, OrderSummary } from '../../services/cart.service';
import { PayPalService } from '../../services/paypal.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { firstValueFrom } from 'rxjs';
import { ShippingInfoService, ShippingInfo } from '../../services/shipping-info.service';
import { MatDialog } from '@angular/material/dialog';
import { ShippingAddressDialogComponent } from './shipping-address-dialog.component';

// Leaflet imports
import { latLng, tileLayer, Marker, marker, icon } from 'leaflet';

declare var paypal: any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, AfterViewInit {
  checkoutForm: FormGroup;
  cartItems: CartItem[] = [];
  subtotal = 0;
  tax = 0;
  total = 0;
  loading = false;
  paymentMethod = 'paypal';
  
  // Group cart items by store for display
  itemsByStore: { storeId: number; storeName: string; items: CartItem[]; total: number }[] = [];

  // Leaflet map state
  mapOptions: any;
  mapCenter = latLng(21.028511, 105.804817); // Default: Hanoi
  mapZoom = 13;
  mapMarker: Marker | null = null;
  map: any = null;
  isMapReady = false;

  // Address state
  selectedLat: number | null = null;
  selectedLng: number | null = null;
  selectedAddress: string = '';
  showMap = false;
  searchAddress: string = '';
  searchSuggestions: any[] = [];
  private searchDebounce: any = null;

  shippingInfos: ShippingInfo[] = [];
  selectedShippingInfoId: number | null = null;
  shippingInfoLoading = false;

  formDirty = false;

  constructor(
    private cartService: CartService,
    private payPalService: PayPalService,
    private router: Router,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private authService: AuthService,
    private imageService: ImageService,
    private shippingInfoService: ShippingInfoService,
    private dialog: MatDialog
  ) {
    this.checkoutForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required]
    });

    this.mapOptions = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        })
      ],
      zoom: this.mapZoom,
      center: this.mapCenter
    };
  }

  ngOnInit(): void {
    this.loadCart();
    this.loadShippingInfos();
    // Autofill user email
    const user = this.authService.getCurrentUser();
    if (user && user.email) {
      this.checkoutForm.patchValue({ email: user.email });
      console.log('Autofilled user email in checkout form:', user.email);
    }
    // Log image URLs for each cart item
    setTimeout(() => {
      if (this.cartItems && this.cartItems.length > 0) {
        this.cartItems.forEach(item => {
          const resolvedUrl = this.imageService.getImageUrl(item.productImageUrl);
          console.log('Cart item image URL:', item.productImageUrl, 'Resolved URL:', resolvedUrl);
        });
      }
    }, 1000); // Delay to ensure cartItems are loaded
    this.checkoutForm.valueChanges.subscribe(() => {
      if (this.selectedShippingInfoId) {
        this.formDirty = true;
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initializePayPal();
  }

  loadCart(): void {
    this.cartService.getCart().subscribe(cart => {
      this.cartItems = cart.items || [];
      this.calculateTotals();
      this.groupItemsByStore();
    });
  }

  groupItemsByStore(): void {
    const grouped = this.cartItems.reduce((groups, item) => {
      const existingGroup = groups.find(g => g.storeId === item.storeId);
      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.total += item.totalPrice;
      } else {
        groups.push({
          storeId: item.storeId,
          storeName: item.storeName,
          items: [item],
          total: item.totalPrice
        });
      }
      return groups;
    }, [] as { storeId: number; storeName: string; items: CartItem[]; total: number }[]);

    this.itemsByStore = grouped;
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    this.tax = this.subtotal * 0.08; // 8% tax
    this.total = this.subtotal + this.tax;
  }

  setPaymentMethod(method: string): void {
    this.paymentMethod = method;
  }

  private addPayPalScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove any existing PayPal script
      const existingScript = document.getElementById('paypal-sdk');
      if (existingScript) {
        console.log('Removing existing PayPal script');
        existingScript.remove();
      }
      
      const clientId = 'AQX2uAl4kvTSTrRky9eJr7eO4rNGehLJD93eb8z1Vvl9hoGB_seEAHh5w-so_pw0jeu2M6PD4dhSqHxs';
      
      // Try different URL formats
      const urls = [
        `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`,
        `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`,
        `https://www.sandbox.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
      ];
      
      let currentUrlIndex = 0;
      
      const tryLoadScript = () => {
        if (currentUrlIndex >= urls.length) {
          reject(new Error('All PayPal script URLs failed'));
          return;
        }
        
        const scriptUrl = urls[currentUrlIndex];
        console.log(`Trying PayPal script URL ${currentUrlIndex + 1}:`, scriptUrl);
        
        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = scriptUrl;
        script.async = true;
        
        script.onload = () => {
          console.log('PayPal script loaded successfully');
          // Check if paypal object is available
          if (typeof (window as any).paypal !== 'undefined') {
            console.log('PayPal object is available');
            resolve();
          } else {
            console.error('PayPal script loaded but paypal object is not available');
            // Try next URL
            currentUrlIndex++;
            script.remove();
            tryLoadScript();
          }
        };
        
        script.onerror = (error) => {
          console.error(`Failed to load PayPal script from URL ${currentUrlIndex + 1}:`, error);
          // Try next URL
          currentUrlIndex++;
          script.remove();
          tryLoadScript();
        };
        
        document.head.appendChild(script);
      };
      
      tryLoadScript();
    });
  }

  private async initializePayPal(): Promise<void> {
    try {
      console.log('Starting PayPal initialization...');
      await this.addPayPalScript();
      
      // Wait for PayPal to be available
      let attempts = 0;
      const maxAttempts = 20;
      
      while (typeof (window as any).paypal === 'undefined' && attempts < maxAttempts) {
        console.log(`Waiting for PayPal SDK... Attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (typeof (window as any).paypal !== 'undefined') {
        console.log('PayPal SDK is available, initializing buttons');
        (window as any).paypal.Buttons({
          createOrder: (data: any, actions: any) => {
            return this.createPayPalOrder();
          },
          onApprove: (data: any, actions: any) => {
            return this.onPayPalApprove(data.orderID);
          },
          onError: (err: any) => {
            console.error('PayPal error:', err);
            this.snackBar.open('PayPal payment failed. Please try again.', 'Close', { duration: 3000 });
          },
          onInit: (data: any, actions: any) => {
            // Disable the button initially
            actions.disable();
            // Watch the form for changes
            this.checkoutForm.statusChanges.subscribe(status => {
              if (status === 'VALID') {
                actions.enable();
              } else {
                actions.disable();
              }
            });
          },
          onClick: (data: any, actions: any) => {
            if (this.checkoutForm.invalid) {
              this.snackBar.open('Please fill in all required fields before proceeding to payment.', 'Close', { duration: 3000 });
              return actions.reject();
            }
            return actions.resolve();
          }
        }).render('#paypal-button-container');
      } else {
        console.error('PayPal SDK not loaded after multiple attempts');
        this.snackBar.open('PayPal is not available. Please refresh the page.', 'Close', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error initializing PayPal:', error);
      this.snackBar.open('Failed to load PayPal. Please refresh the page.', 'Close', { duration: 3000 });
    }
  }

  private async createPayPalOrder(): Promise<string> {
    try {
      const shippingInfo = this.checkoutForm.value;
      console.log('Checkout form values at PayPal order creation:', shippingInfo);
      const response = await firstValueFrom(
        this.payPalService.createOrder(this.total, shippingInfo)
      );
      console.log('PayPal createOrder response:', response);
      if (response && response.orderId) {
        return response.orderId;
      } else {
        throw new Error('Failed to create PayPal order');
      }
    } catch (error) {
      this.snackBar.open('Failed to create PayPal order. Please try again.', 'Close', { duration: 3000 });
      throw error;
    }
  }

  private async onPayPalApprove(orderId: string): Promise<void> {
    this.loading = true;
    console.log('PayPal order approved, capturing order:', orderId);

    try {
      // Capture the payment
      const captureResponse = await firstValueFrom(this.payPalService.captureOrder(orderId));
      console.log('PayPal capture response:', captureResponse);
      if (captureResponse && captureResponse.status === 'COMPLETED') {
        // Payment successful
        const orderMessage = captureResponse.orderCount > 1 
          ? `Payment successful! ${captureResponse.orderCount} orders have been placed.`
          : `Payment successful! Your order #${captureResponse.orderNumber} has been placed.`;
        this.snackBar.open(orderMessage, 'Close', { duration: 5000 });
        // Clear cart
        this.cartService.clearCart().subscribe(() => {
          console.log('Cart cleared after successful checkout. Navigating to /virtual-street.');
          this.router.navigate(['/virtual-street']);
        });
      } else {
        throw new Error('Payment was not completed');
      }
    } catch (error) {
      console.error('PayPal capture error:', error);
      this.snackBar.open('Payment failed. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  processPayment(): void {
    // This method is now handled by PayPal buttons
    // Form validation is handled by PayPal SDK
    if (this.checkoutForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }

  onMapReady(map: any) {
    this.map = map;
    this.isMapReady = true;
    // Manually subscribe to Leaflet map click event
    map.on('click', (event: any) => this.onMapClick(event));
  }

  private getCustomIcon() {
    return icon({
      iconUrl: 'assets/my-marker.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      // Optionally add shadowUrl and shadowSize if you have a shadow image
    });
  }

  onMapClick(event: any) {
    console.log('Map clicked:', event);
    if (event && event.latlng) {
      this.selectedLat = event.latlng.lat;
      this.selectedLng = event.latlng.lng;
      const customIcon = this.getCustomIcon();
      if (this.mapMarker) {
        this.mapMarker.setLatLng(event.latlng);
        this.mapMarker.setIcon(customIcon);
      } else {
        this.mapMarker = marker(event.latlng, { icon: customIcon }).addTo(this.map);
      }
      this.reverseGeocode(event.latlng.lat, event.latlng.lng);
    }
  }

  toggleMap(): void {
    this.showMap = !this.showMap;
    if (this.showMap && this.map) {
      // Trigger map resize when showing
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
    }
  }

  async searchLocation(): Promise<void> {
    console.log('searchLocation called with:', this.searchAddress);
    if (!this.searchAddress.trim() || !this.map) {
      this.snackBar.open('Please enter an address to search.', 'Close', { duration: 2000 });
      return;
    }

    try {
      // Use Nominatim for geocoding
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddress)}&limit=1&addressdetails=1`;
      console.log('Fetching:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Nominatim response:', data);

      if (data && data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        // Update map center and add marker
        this.map.setView([lat, lng], 16);
        
        // Update selected location
        this.selectedLat = lat;
        this.selectedLng = lng;
        this.selectedAddress = location.display_name;
        
        // Update marker
        if (this.mapMarker) {
          this.mapMarker.setLatLng([lat, lng]);
        } else {
          this.mapMarker = marker([lat, lng]).addTo(this.map);
        }
        
        // Parse and fill address components
        this.parseAndFillAddress(location);
        
        this.snackBar.open('Location found!', 'Close', { duration: 2000 });
      } else {
        this.snackBar.open('Address not found. Please try a different search term.', 'Close', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error searching location:', error);
      this.snackBar.open('Error searching for address. Please try again.', 'Close', { duration: 3000 });
    }
  }

  async reverseGeocode(lat: number, lng: number) {
    // Use Nominatim for free reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Reverse geocode response:', data);
      this.selectedAddress = data.display_name || '';
      
      // Parse address components and update form
      this.parseAndFillAddress(data);
    } catch (err) {
      this.selectedAddress = '';
      this.snackBar.open('Could not fetch address for selected location.', 'Close', { duration: 3000 });
    }
  }

  private parseAndFillAddress(data: any) {
    const address = data.address || {};
    // Use display_name as the full address
    const fullAddress = data.display_name || '';

    const city = address.city || address.town || address.village || address.county || '';
    // Prefer suburb for state if available
    const state = address.suburb || address.state || address.province || address.city_district || address.district || address.borough || '';
    const country = address.country || '';
    const postcode = address.postcode || '';

    this.checkoutForm.patchValue({
      address: fullAddress,
      city: city,
      state: state,
      country: country,
      zipCode: postcode
    });

    // Show success message if we found address components
    const filledFields = [city, state, country, postcode].filter(Boolean).length;
    if (filledFields > 0) {
      this.snackBar.open(`Address fields auto-filled! Found ${filledFields} location details.`, 'Close', { 
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Geolocation is not supported by this browser.', 'Close', { duration: 3000 });
      return;
    }

    this.snackBar.open('Getting your current location...', 'Close', { duration: 2000 });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Update map center
        if (this.map) {
          this.map.setView([lat, lng], 16);
          
          // Update selected location
          this.selectedLat = lat;
          this.selectedLng = lng;
          
          // Update marker
          if (this.mapMarker) {
            this.mapMarker.setLatLng([lat, lng]);
          } else {
            this.mapMarker = marker([lat, lng]).addTo(this.map);
          }
          
          // Get address for the coordinates
          this.reverseGeocode(lat, lng);
        }
      },
      (error) => {
        console.error('Error getting current location:', error);
        let errorMessage = 'Unable to get your current location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 3000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  clearAddressFields(): void {
    // Clear only the address-related fields
    this.checkoutForm.patchValue({
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    });
    
    this.snackBar.open('Address fields cleared. You can now enter information manually.', 'Close', { 
      duration: 3000 
    });
  }

  onSearchInputChange(): void {
    console.log('Input changed:', this.searchAddress);
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      console.log('Debounced fetch for:', this.searchAddress);
      this.fetchSearchSuggestions();
    }, 400);
  }

  async fetchSearchSuggestions(): Promise<void> {
    console.log('fetchSearchSuggestions called with:', this.searchAddress);
    if (!this.searchAddress.trim()) {
      this.searchSuggestions = [];
      console.log('No searchAddress, clearing suggestions');
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddress)}&addressdetails=1&limit=5`;
      console.log('Fetching suggestions from:', url);
      const response = await fetch(url);
      const data = await response.json();
      this.searchSuggestions = data;
      console.log('Suggestions received:', data);
    } catch (error) {
      this.searchSuggestions = [];
      console.error('Error fetching suggestions:', error);
    }
  }

  selectSuggestion(suggestion: any): void {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    this.map.setView([lat, lng], 16);
    this.selectedLat = lat;
    this.selectedLng = lng;
    this.selectedAddress = suggestion.display_name;
    this.searchAddress = suggestion.display_name;
    if (this.mapMarker) {
      this.mapMarker.setLatLng([lat, lng]);
    } else {
      this.mapMarker = marker([lat, lng]).addTo(this.map);
    }
    // Set the address field directly from the suggestion's display_name
    this.checkoutForm.patchValue({ address: suggestion.display_name });
    this.parseAndFillAddress(suggestion);
    this.searchSuggestions = [];
  }

  loadShippingInfos(): void {
    this.shippingInfoLoading = true;
    this.shippingInfoService.getShippingInfos().subscribe({
      next: infos => {
        this.shippingInfos = infos;
        // Do not auto-select or patch the form here
        this.shippingInfoLoading = false;
      },
      error: () => {
        this.shippingInfos = [];
        this.shippingInfoLoading = false;
      }
    });
  }

  patchFormWithShippingInfo(info: ShippingInfo): void {
    this.checkoutForm.patchValue({
      firstName: info.firstName,
      lastName: info.lastName,
      email: info.email,
      phone: info.phone,
      address: info.address,
      city: info.city,
      state: info.state,
      zipCode: info.zipCode,
      country: info.country
    });
  }

  onSelectShippingInfo(id: number): void {
    this.selectedShippingInfoId = id;
    const info = this.shippingInfos.find(i => i.id === id);
    if (info) this.patchFormWithShippingInfo(info);
  }

  addShippingInfo(): void {
    if (this.checkoutForm.valid) {
      const info: ShippingInfo = this.checkoutForm.value;
      this.shippingInfoService.addShippingInfo(info).subscribe({
        next: saved => {
          this.snackBar.open('Shipping address added!', 'Close', { duration: 2000 });
          this.loadShippingInfos();
        },
        error: () => {
          this.snackBar.open('Failed to add shipping address.', 'Close', { duration: 2000 });
        }
      });
    }
  }

  updateShippingInfo(): void {
    if (this.checkoutForm.valid && this.selectedShippingInfoId) {
      const info: ShippingInfo = this.checkoutForm.value;
      this.shippingInfoService.updateShippingInfo(this.selectedShippingInfoId, info).subscribe({
        next: updated => {
          this.snackBar.open('Shipping address updated!', 'Close', { duration: 2000 });
          this.loadShippingInfos();
        },
        error: () => {
          this.snackBar.open('Failed to update shipping address.', 'Close', { duration: 2000 });
        }
      });
    }
  }

  deleteShippingInfo(id: number): void {
    this.shippingInfoService.deleteShippingInfo(id).subscribe({
      next: () => {
        this.snackBar.open('Shipping address deleted!', 'Close', { duration: 2000 });
        this.loadShippingInfos();
      },
      error: () => {
        this.snackBar.open('Failed to delete shipping address.', 'Close', { duration: 2000 });
      }
    });
  }

  openShippingAddressDialog(): void {
    this.dialog.open(ShippingAddressDialogComponent, {
      width: '400px',
      data: {
        shippingInfos: this.shippingInfos,
        selectedId: this.selectedShippingInfoId
      }
    }).afterClosed().subscribe((selected: ShippingInfo | undefined) => {
      if (selected) {
        this.selectedShippingInfoId = selected.id!;
        this.patchFormWithShippingInfo(selected);
        this.formDirty = false;
      }
    });
  }

  saveShippingInfo(): void {
    if (this.checkoutForm.valid) {
      const value = this.checkoutForm.value;
      if (this.selectedShippingInfoId && this.shippingInfos.length > 0) {
        this.shippingInfoService.updateShippingInfo(this.selectedShippingInfoId, value).subscribe(() => {
          this.snackBar.open('Shipping address updated!', 'Close', { duration: 2000 });
          this.loadShippingInfos();
          this.formDirty = false;
        });
      } else {
        this.shippingInfoService.addShippingInfo(value).subscribe(() => {
          this.snackBar.open('Shipping address saved!', 'Close', { duration: 2000 });
          this.loadShippingInfos();
          this.formDirty = false;
        });
      }
    } else {
      this.snackBar.open('Please fill in all required fields.', 'Close', { duration: 2000 });
    }
  }

  onPayPalButtonClick(): void {
    if (this.shippingInfos.length === 0) {
      this.saveShippingInfo();
      // Optionally wait for save to complete before proceeding
    }
    // Proceed with PayPal logic...
  }
} 