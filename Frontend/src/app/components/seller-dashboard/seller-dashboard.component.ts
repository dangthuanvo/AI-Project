import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService, Store, Product, MonthlyStats } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileUploadService } from '../../services/file-upload.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-seller-dashboard',
  templateUrl: './seller-dashboard.component.html',
  styleUrls: ['./seller-dashboard.component.scss']
})
export class SellerDashboardComponent implements OnInit {
  currentUser: any;
  userStores: Store[] = [];
  userProducts: Product[] = [];
  userOrders: any[] = [];
  selectedStore: any = null;
  products: any[] = [];
  orders: any[] = [];
  loading = false;
  activeTab = 'overview';
  
  // Forms
  storeForm!: FormGroup;
  productForm!: FormGroup;
  showAddStore = false;
  showAddProduct = false;
  showEditStore = false;

  selectedFiles: File[] = [];
  imagePreviews: string[] = [];

  selectedLogoFile: File | null = null;
  logoPreview: string | null = null;
  selectedBannerFile: File | null = null;
  bannerPreview: string | null = null;

  // Make document accessible in template
  document = document;

  editingProduct: Product | null = null;
  replacingLogo = false;
  replacingBanner = false;
  
  // Order detail properties
  showOrderDetail = false;
  selectedOrder: any = null;

  // Year selector for chart
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  // Chart data for statistics
  public chartData: any = {
    labels: [] as string[],
    datasets: [
      { data: [] as number[], label: 'Orders' },
      { data: [] as number[], label: 'Revenue ($)' }
    ]
  };
  public chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Monthly Orders & Revenue' }
    },
    scales: {
      y: {
        beginAtZero: true,
        min: 0
      }
    }
  };
  public chartType: any = 'line';

  productSearchTerm: string = '';
  filteredProducts: Product[] = [];

  constructor(
    private storeService: StoreService,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private fileUploadService: FileUploadService,
    private imageService: ImageService
  ) {
    this.initializeForms();
    this.initializeAvailableYears();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUserData();
  }

  private initializeForms(): void {
    this.storeForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      primaryColor: ['#1976d2'],
      secondaryColor: ['#42a5f5']
    });

    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      stockQuantity: ['', [Validators.required, Validators.min(0)]],
      imageUrls: [[]],
      category: ['', Validators.required]
    });
  }

  private initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    // Generate years from 2020 to current year
    for (let year = 2020; year <= currentYear; year++) {
      this.availableYears.push(year);
    }
  }

  loadUserData(): void {
    this.loadUserStores();
  }

  loadMonthlyStats(): void {
    this.storeService.getMonthlyStats(this.selectedYear).subscribe({
      next: (stats: MonthlyStats) => {
        this.chartData = {
          labels: stats.labels,
          datasets: [
            { data: stats.orders, label: 'Orders' },
            { data: stats.revenue, label: 'Revenue ($)' }
          ]
        };
        // Update chart title to include year
        this.chartOptions = {
          ...this.chartOptions,
          plugins: {
            ...this.chartOptions.plugins,
            title: { display: true, text: `Monthly Orders & Revenue - ${stats.year}` }
          },
          scales: {
            y: {
              beginAtZero: true,
              min: 0
            }
          }
        };
      },
      error: (error) => {
        console.error('Error loading monthly stats:', error);
        // Fallback to empty chart if stats fail to load
        this.chartData = {
          labels: [],
          datasets: [
            { data: [], label: 'Orders' },
            { data: [], label: 'Revenue ($)' }
          ]
        };
      }
    });
  }

  onYearChange(): void {
    this.loadMonthlyStats();
  }

  loadUserStores(): void {
    this.loading = true;
    // This would call your backend API to get stores owned by the current user
    this.storeService.getUserStores().subscribe({
      next: (store) => {
        // Convert single store to array for compatibility
        this.userStores = store ? [store] : [];
        if (store) {
          this.selectStore(store);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stores:', error);
        this.snackBar.open('Error loading stores', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  selectStore(store: any): void {
    this.selectedStore = store;
    this.loadStoreData(store.id);
    this.loadMonthlyStats(); // Load monthly stats when store is selected
  }

  loadStoreData(storeId: number): void {
    this.loadProducts(storeId);
    this.loadOrders(storeId);
  }

  loadProducts(storeId: number): void {
    this.storeService.getStoreProducts(storeId).subscribe({
      next: (products) => {
        this.products = products;
        this.filterProducts();
      },
      error: (error) => {
        console.error('Error loading products:', error);
      }
    });
  }

  loadOrders(storeId: number): void {
    this.storeService.getStoreOrders(storeId).subscribe({
      next: (orders) => {
        // Sort orders by orderDate descending
        this.orders = orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  async createStore(): Promise<void> {
    if (this.storeForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    try {
      let logoUrl: string | undefined = undefined;
      let bannerUrl: string | undefined = undefined;

      // Upload logo if selected
      if (this.selectedLogoFile) {
        const uploadedLogoUrl = await this.uploadLogo();
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        } else {
          this.snackBar.open('Failed to upload logo', 'Close', { duration: 3000 });
          return;
        }
      }

      // Upload banner if selected
      if (this.selectedBannerFile) {
        const uploadedBannerUrl = await this.uploadBanner();
        if (uploadedBannerUrl) {
          bannerUrl = uploadedBannerUrl;
        } else {
          this.snackBar.open('Failed to upload banner', 'Close', { duration: 3000 });
          return;
        }
      }

      const storeData: any = {
        ...this.storeForm.value,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        positionX: Math.floor(Math.random() * 1000) // Random position for now
      };

      this.storeService.createStore(storeData).subscribe({
        next: (newStore) => {
          // Replace the array with the new store since only one store is allowed
          this.userStores = [newStore];
          this.selectedStore = newStore;
          this.showAddStore = false;
          this.storeForm.reset();
          this.clearLogoSelection();
          this.clearBannerSelection();
          this.snackBar.open('Store created successfully!', 'Close', { duration: 3000 });
          
          // Reload store data after creation
          this.loadStoreData(newStore.id);
        },
        error: (error) => {
          console.error('Error creating store:', error);
          this.snackBar.open('Error creating store', 'Close', { duration: 3000 });
        }
      });
    } catch (error) {
      console.error('Error in createStore:', error);
      this.snackBar.open('Error creating store', 'Close', { duration: 3000 });
    }
  }

  async editStore(): Promise<void> {
    if (this.storeForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    try {
      let logoUrl: string | undefined = this.selectedStore?.logoUrl;
      let bannerUrl: string | undefined = this.selectedStore?.bannerUrl;

      // Upload new logo if selected
      if (this.selectedLogoFile) {
        const uploadedLogoUrl = await this.uploadLogo();
        if (uploadedLogoUrl) {
          // Delete old logo if it exists and we're replacing it
          if (this.replacingLogo && this.selectedStore?.logoUrl) {
            try {
              await this.fileUploadService.deleteImage(this.selectedStore.logoUrl).toPromise();
            } catch (error) {
              console.warn('Failed to delete old logo:', error);
            }
          }
          logoUrl = uploadedLogoUrl;
        } else {
          this.snackBar.open('Failed to upload logo', 'Close', { duration: 3000 });
          return;
        }
      }

      // Upload new banner if selected
      if (this.selectedBannerFile) {
        const uploadedBannerUrl = await this.uploadBanner();
        if (uploadedBannerUrl) {
          // Delete old banner if it exists and we're replacing it
          if (this.replacingBanner && this.selectedStore?.bannerUrl) {
            try {
              await this.fileUploadService.deleteImage(this.selectedStore.bannerUrl).toPromise();
            } catch (error) {
              console.warn('Failed to delete old banner:', error);
            }
          }
          bannerUrl = uploadedBannerUrl;
        } else {
          this.snackBar.open('Failed to upload banner', 'Close', { duration: 3000 });
          return;
        }
      }

      const storeData: any = {
        ...this.storeForm.value,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined
      };

      this.storeService.updateMyStore(storeData).subscribe({
        next: (updatedStore) => {
          // Update the store in the array
          this.userStores = [updatedStore];
          this.selectedStore = updatedStore;
          this.showEditStore = false;
          this.storeForm.reset();
          this.clearLogoSelection();
          this.clearBannerSelection();
          this.replacingLogo = false;
          this.replacingBanner = false;
          this.snackBar.open('Store updated successfully!', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error updating store:', error);
          this.snackBar.open('Error updating store', 'Close', { duration: 3000 });
        }
      });
    } catch (error) {
      console.error('Error in editStore:', error);
      this.snackBar.open('Error updating store', 'Close', { duration: 3000 });
    }
  }

  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      this.selectedFiles.push(files[i]);
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagePreviews.push(e.target.result);
      reader.readAsDataURL(files[i]);
    }
  }

  removeImage(index: number): void {
    this.imagePreviews.splice(index, 1);
    const urls = this.productForm.get('imageUrls')?.value;
    if (urls && urls.length > index) {
      urls.splice(index, 1);
      this.productForm.get('imageUrls')?.setValue(urls);
    }
    if (this.selectedFiles.length > index) {
      this.selectedFiles.splice(index, 1);
    }
  }

  async uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of this.selectedFiles) {
      const url = await this.fileUploadService.uploadImage(file).toPromise();
      if (url) urls.push(url);
    }
    return urls;
  }

  async addProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }
    let imageUrls: string[] = this.productForm.get('imageUrls')?.value || [];
    if (this.selectedFiles.length > 0) {
      imageUrls = await this.uploadImages();
      this.productForm.get('imageUrls')?.setValue(imageUrls);
    }
    const productData = { ...this.productForm.value, imageUrls };
    this.storeService.addProduct(productData).subscribe({
      next: () => {
        this.showAddProduct = false;
        this.productForm.reset();
        this.selectedFiles = [];
        this.imagePreviews = [];
        this.snackBar.open('Product added successfully!', 'Close', { duration: 3000 });
        this.loadProducts(this.selectedStore.id);
      },
      error: (error) => {
        console.error('Error adding product:', error);
        this.snackBar.open('Error adding product', 'Close', { duration: 3000 });
      }
    });
  }

  updateOrderStatus(order: any, status: string): void {
    if (this.authService.hasRole('Admin')) {
      this.snackBar.open('Admins cannot update order status.', 'Close', { duration: 3000 });
      return;
    }
    this.storeService.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        order.status = status;
        // Update selected order if it's the same order
        if (this.selectedOrder && this.selectedOrder.id === order.id) {
          this.selectedOrder.status = status;
        }
        this.snackBar.open('Order status updated!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.snackBar.open('Error updating order status', 'Close', { duration: 3000 });
      }
    });
  }

  deleteProduct(product: any): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.storeService.deleteProduct(product.id).subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== product.id);
          this.snackBar.open('Product deleted successfully!', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.snackBar.open('Error deleting product', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getOrderStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return '#ff9800';
      case 'processing': return '#2196f3';
      case 'shipped': return '#4caf50';
      case 'delivered': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  get totalProducts(): number {
    return this.products.length;
  }

  get totalOrders(): number {
    return this.orders.length;
  }

  get pendingOrdersCount(): number {
    return this.orders.filter(o => o.status === 'pending').length;
  }

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'image/jfif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon'
      ];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Please select a valid image file (JPG, JPEG, PNG, GIF, WebP, JFIF, BMP, TIFF, SVG, ICO)', 'Close', { duration: 3000 });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('File size too large. Maximum size is 5MB.', 'Close', { duration: 3000 });
        return;
      }

      this.selectedLogoFile = file;
      this.replacingLogo = true;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearLogoSelection(): void {
    this.selectedLogoFile = null;
    this.logoPreview = null;
    this.replacingLogo = false;
  }

  onBannerSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'image/jfif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon'
      ];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Please select a valid image file (JPG, JPEG, PNG, GIF, WebP, JFIF, BMP, TIFF, SVG, ICO)', 'Close', { duration: 3000 });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('File size too large. Maximum size is 5MB.', 'Close', { duration: 3000 });
        return;
      }

      this.selectedBannerFile = file;
      this.replacingBanner = true;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.bannerPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearBannerSelection(): void {
    this.selectedBannerFile = null;
    this.bannerPreview = null;
    this.replacingBanner = false;
  }

  async uploadLogo(): Promise<string | undefined> {
    if (!this.selectedLogoFile) {
      return undefined;
    }

    try {
      const logoUrl = await this.fileUploadService.uploadImage(this.selectedLogoFile).toPromise();
      this.snackBar.open('Logo uploaded successfully!', 'Close', { duration: 2000 });
      return logoUrl || undefined;
    } catch (error) {
      console.error('Error uploading logo:', error);
      this.snackBar.open('Error uploading logo', 'Close', { duration: 3000 });
      return undefined;
    }
  }

  async uploadBanner(): Promise<string | undefined> {
    if (!this.selectedBannerFile) {
      return undefined;
    }

    try {
      const bannerUrl = await this.fileUploadService.uploadImage(this.selectedBannerFile).toPromise();
      this.snackBar.open('Banner uploaded successfully!', 'Close', { duration: 2000 });
      return bannerUrl || undefined;
    } catch (error) {
      console.error('Error uploading banner:', error);
      this.snackBar.open('Error uploading banner', 'Close', { duration: 3000 });
      return undefined;
    }
  }

  openEditStore(): void {
    if (this.selectedStore) {
      this.storeForm.patchValue({
        name: this.selectedStore.name,
        description: this.selectedStore.description,
        primaryColor: this.selectedStore.primaryColor || '#000000',
        secondaryColor: this.selectedStore.secondaryColor || '#FFFFFF'
      });
      
      // Load current logo and banner if they exist
      if (this.selectedStore.logoUrl) {
        this.logoPreview = this.imageService.getImageUrl(this.selectedStore.logoUrl);
      }
      if (this.selectedStore.bannerUrl) {
        this.bannerPreview = this.imageService.getImageUrl(this.selectedStore.bannerUrl);
      }
      
      this.showEditStore = true;
    }
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }

  viewOrderDetails(order: any): void {
    this.selectedOrder = order;
    this.showOrderDetail = true;
  }

  openEditProduct(product: Product): void {
    this.editingProduct = product;
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      imageUrls: product.imageUrls ? [...product.imageUrls] : [],
      category: product.category
    });
    this.imagePreviews = product.imageUrls ? product.imageUrls.map(url => this.imageService.getImageUrl(url)) : [];
    this.selectedFiles = [];
    this.showAddProduct = true;
  }

  async saveProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }
    try {
      let imageUrls: string[] = this.productForm.get('imageUrls')?.value || [];
      if (this.selectedFiles.length > 0) {
        const uploadedUrls = await this.uploadImages();
        imageUrls = imageUrls.concat(uploadedUrls);
        this.productForm.get('imageUrls')?.setValue(imageUrls);
      }
      const productData = {
        ...this.productForm.value,
        imageUrls
      };
      if (this.editingProduct) {
        this.storeService.updateProduct(this.editingProduct.id, productData).subscribe({
          next: (updatedProduct) => {
            const idx = this.products.findIndex(p => p.id === this.editingProduct!.id);
            if (idx !== -1) this.products[idx] = { ...this.products[idx], ...productData };
            this.showAddProduct = false;
            this.productForm.reset();
            this.selectedFiles = [];
            this.imagePreviews = [];
            this.editingProduct = null;
            this.snackBar.open('Product updated successfully!', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error updating product:', error);
            this.snackBar.open('Error updating product', 'Close', { duration: 3000 });
          }
        });
      } else {
        this.storeService.createProduct(this.selectedStore?.id || 0, productData).subscribe({
          next: (newProduct) => {
            this.products.push(newProduct);
            this.showAddProduct = false;
            this.productForm.reset();
            this.selectedFiles = [];
            this.imagePreviews = [];
            this.snackBar.open('Product added successfully!', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error adding product:', error);
            this.snackBar.open('Error adding product', 'Close', { duration: 3000 });
          }
        });
      }
    } catch (error) {
      console.error('Error in saveProduct:', error);
      this.snackBar.open('Error saving product', 'Close', { duration: 3000 });
    }
  }

  filterProducts(): void {
    const term = this.productSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredProducts = this.products;
      return;
    }
    this.filteredProducts = this.products.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    );
  }

  clearProductSearch(): void {
    this.productSearchTerm = '';
    this.filterProducts();
  }
} 