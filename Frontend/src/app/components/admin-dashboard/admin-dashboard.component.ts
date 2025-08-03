import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, interval } from 'rxjs';
import { AdminService, User, Store, Product, Order, SystemStats, UserStats, StoreStats, OrderStats, ProductStats, RevenueHistoryItem, UserGrowthHistoryItem, OrderStatusHistoryItem } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { PresenceService, PlayerState } from '../../services/presence.service';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  // Chart ViewChild references
  @ViewChild('revenueChart', { static: false }) revenueChartRef!: ElementRef;
  @ViewChild('userGrowthChart', { static: false }) userGrowthChartRef!: ElementRef;
  @ViewChild('orderStatusChart', { static: false }) orderStatusChartRef!: ElementRef;
  @ViewChild('topStoresChart', { static: false }) topStoresChartRef!: ElementRef;
  
  // Chart instances
  private revenueChart: Chart | null = null;
  private userGrowthChart: Chart | null = null;
  private orderStatusChart: Chart | null = null;
  private topStoresChart: Chart | null = null;
  
  // Dashboard state
  activeTab = 0; // Changed to number for mat-tab-group
  loading = false;
  currentUser: any;
  
  // Statistics
  systemStats: SystemStats | null = null;
  userStats: UserStats | null = null;
  storeStats: StoreStats | null = null;
  orderStats: OrderStats | null = null;
  productStats: ProductStats | null = null;
  
  // Data lists
  users: User[] = [];
  stores: Store[] = [];
  products: Product[] = [];
  orders: Order[] = [];
  
  // Filtered data lists
  filteredUsers: User[] = [];
  filteredStores: Store[] = [];
  filteredProducts: Product[] = [];
  filteredOrders: Order[] = [];
  
  // Forms
  userForm!: FormGroup;
  
  // UI state
  showAddUser = false;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  
  // Search and filters
  searchTerm = '';
  statusFilter = 'all';
  roleFilter = 'all';
  
  // Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Real-time updates
  private refreshInterval: any;

  // Order detail state
  selectedOrder: Order | null = null;

  // Monitor (Street Minimap) state
  showMonitor = false;
  playerStates: PlayerState[] = [];
  minimapWidth = 400;
  minimapHeight = 120;
  streetLength = 2000; // Should match virtual street roadLength
  minimapScale = 0.2; // minimapWidth / streetLength
  minimapPlayerSize = 12;
  minimapStreetHeight = 400; // Should match virtual street height
  roadLength = 2000;

  // Only show active stores on the minimap
  get activeStores() {
    return this.stores.filter(s => s.isActive);
  }

  selectedUserId: string | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder,
    public imageService: ImageService,
    private presenceService: PresenceService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeForms();
    this.loadDashboardData();
    this.loadStores(); // Ensure stores are loaded for minimap
    this.startAutoRefresh();
    
    // Subscribe to player states for monitor
    this.presenceService.allPlayerStates$.pipe(takeUntil(this.destroy$)).subscribe(states => {
      this.playerStates = states;
      // Dynamically set roadLength based on max player x (fallback to 2000)
      const maxX = states.length > 0 ? Math.max(...states.map(p => p.x)) : 2000;
      this.roadLength = Math.max(1200, maxX + 200); // Add margin like virtual street
    });
    
    // Add window resize listener to handle chart resizing
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    
    // Add visibility change listener to handle chart resizing when tab becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleWindowResize(): void {
    // Resize charts when window is resized to prevent positioning issues
    if (this.activeTab === 0) {
      this.resizeCharts();
      // Force another resize after a delay to ensure proper positioning
      setTimeout(() => {
        this.resizeCharts();
      }, 100);
    }
  }

  private handleVisibilityChange(): void {
    // Resize charts when the page becomes visible (e.g., when switching back to the tab)
    if (!document.hidden && this.activeTab === 0) {
      setTimeout(() => {
        this.resizeCharts();
      }, 100);
    }
  }

  private resizeCharts(): void {
    if (this.revenueChart) {
      this.revenueChart.resize();
    }
    if (this.userGrowthChart) {
      this.userGrowthChart.resize();
    }
    if (this.orderStatusChart) {
      this.orderStatusChart.resize();
    }
    if (this.topStoresChart) {
      this.topStoresChart.resize();
    }
  }

  private ensureChartsInitialized(): void {
    // Check if charts exist and reinitialize if needed
    if (!this.revenueChart || !this.userGrowthChart || !this.orderStatusChart || !this.topStoresChart) {
      this.initializeChartsWithRetry();
    }
  }

  ngAfterViewInit(): void {
    // Initialize charts after view is initialized with better timing
    this.initializeChartsWithRetry();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleWindowResize.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Destroy charts
    this.destroyCharts();
  }

  private destroyCharts(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.userGrowthChart) {
      this.userGrowthChart.destroy();
      this.userGrowthChart = null;
    }
    if (this.orderStatusChart) {
      this.orderStatusChart.destroy();
      this.orderStatusChart = null;
    }
    if (this.topStoresChart) {
      this.topStoresChart.destroy();
      this.topStoresChart = null;
    }
  }

  private recreateCharts(): void {
    // Destroy existing charts first
    this.destroyCharts();
    
    // Wait a bit then recreate
    setTimeout(() => {
      this.initializeChartsWithRetry();
    }, 100);
  }

  private initializeChartsWithRetry(): void {
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      // Check if all chart elements are available and have proper dimensions
      if (this.revenueChartRef?.nativeElement && 
          this.userGrowthChartRef?.nativeElement && 
          this.orderStatusChartRef?.nativeElement && 
          this.topStoresChartRef?.nativeElement) {
        
        // Check if containers have proper dimensions
        const revenueContainer = this.revenueChartRef.nativeElement.parentElement;
        const userGrowthContainer = this.userGrowthChartRef.nativeElement.parentElement;
        const orderStatusContainer = this.orderStatusChartRef.nativeElement.parentElement;
        const topStoresContainer = this.topStoresChartRef.nativeElement.parentElement;
        
        if (revenueContainer && userGrowthContainer && orderStatusContainer && topStoresContainer) {
          const containers = [revenueContainer, userGrowthContainer, orderStatusContainer, topStoresContainer];
          const hasDimensions = containers.every(container => {
            const rect = container.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          if (hasDimensions) {
            // Force a small delay to ensure DOM is fully rendered
            setTimeout(() => {
              this.initializeCharts();
              // Force chart resize after initialization
              setTimeout(() => {
                this.resizeCharts();
              }, 50);
            }, 10);
          } else {
            // Retry after a short delay if containers don't have proper dimensions
            setTimeout(() => {
              this.initializeChartsWithRetry();
            }, 100);
          }
        } else {
          // Retry after a short delay if containers aren't ready
          setTimeout(() => {
            this.initializeChartsWithRetry();
          }, 50);
        }
      } else {
        // Retry after a short delay if elements aren't ready
        setTimeout(() => {
          this.initializeChartsWithRetry();
        }, 50);
      }
    });
  }

  private initializeForms(): void {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      isActive: [true]
    });
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    // Load all statistics
    this.adminService.getSystemStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.systemStats = stats;
        this.updateChartsWithRealData();
      },
      error: (error) => this.handleError('Failed to load system stats', error)
    });

    this.adminService.getUserStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.userStats = stats;
        this.updateChartsWithRealData();
      },
      error: (error) => this.handleError('Failed to load user stats', error)
    });

    this.adminService.getStoreStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.storeStats = stats;
        this.updateChartsWithRealData();
      },
      error: (error) => this.handleError('Failed to load store stats', error)
    });

    this.adminService.getOrderStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.orderStats = stats;
        this.updateChartsWithRealData();
      },
      error: (error) => this.handleError('Failed to load order stats', error)
    });

    this.adminService.getProductStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.productStats = stats;
        this.loading = false;
        this.updateChartsWithRealData();
      },
      error: (error) => {
        this.handleError('Failed to load product stats', error);
        this.loading = false;
      }
    });
  }

  private updateChartsWithRealData(): void {
    // Only update charts if they exist and we're on the overview tab
    if (this.activeTab === 0 && this.revenueChart && this.userGrowthChart && this.orderStatusChart && this.topStoresChart) {
      // Update charts with real data
      this.updateRevenueChart();
      this.updateUserGrowthChart();
      this.updateOrderStatusChart();
      this.updateTopStoresChart();
      
      // Force resize after data update to ensure proper positioning
      setTimeout(() => {
        this.resizeCharts();
      }, 50);
      
      // Force another resize after a longer delay to ensure proper positioning
      setTimeout(() => {
        this.resizeCharts();
      }, 200);
    }
  }

  private updateRevenueChart(): void {
    if (!this.revenueChart || !this.systemStats?.revenueHistory) return;
    
    const revenueData = this.systemStats.revenueHistory;
    const labels = revenueData.map((item: RevenueHistoryItem) => item.month);
    const data = revenueData.map((item: RevenueHistoryItem) => item.revenue);
    
    this.revenueChart.data.labels = labels;
    this.revenueChart.data.datasets[0].data = data;
    this.revenueChart.update();
  }

  private updateUserGrowthChart(): void {
    if (!this.userGrowthChart || !this.userStats?.userGrowthHistory) return;
    
    const userGrowthData = this.userStats.userGrowthHistory;
    const labels = userGrowthData.map((item: UserGrowthHistoryItem) => item.month);
    const data = userGrowthData.map((item: UserGrowthHistoryItem) => item.newUsers);
    
    this.userGrowthChart.data.labels = labels;
    this.userGrowthChart.data.datasets[0].data = data;
    this.userGrowthChart.update();
  }

  private updateOrderStatusChart(): void {
    if (!this.orderStatusChart || !this.orderStats?.orderStatusHistory) return;
    
    const orderStatusData = this.orderStats.orderStatusHistory;
    const labels = orderStatusData.map((item: OrderStatusHistoryItem) => item.status);
    const data = orderStatusData.map((item: OrderStatusHistoryItem) => item.count);
    
    this.orderStatusChart.data.labels = labels;
    this.orderStatusChart.data.datasets[0].data = data;
    this.orderStatusChart.update();
  }

  private updateTopStoresChart(): void {
    if (!this.topStoresChart || !this.stores.length) return;
    
    // Recalculate store revenue with real data
    const storeRevenue = this.stores.map(store => {
      const revenue = store.products?.reduce((total: number, product: Product) => {
        return total + product.price;
      }, 0) || 0;
      
      return {
        name: store.name,
        revenue: revenue
      };
    });

    const topStores = storeRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const labels = topStores.map(store => store.name);
    const data = topStores.map(store => store.revenue);
    
    this.topStoresChart.data.labels = labels;
    this.topStoresChart.data.datasets[0].data = data;
    this.topStoresChart.update();
  }

  private startAutoRefresh(): void {
    // Refresh data every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 30000);
  }

  // Tab Management
  setActiveTab(tabIndex: number): void {
    this.activeTab = tabIndex;
    this.searchTerm = ''; // Reset search when switching tabs
    this.statusFilter = 'all'; // Reset status filter
    this.roleFilter = 'all'; // Reset role filter
    this.sortField = ''; // Reset sorting
    this.sortDirection = 'desc'; // Reset sort direction
    this.loadTabData(tabIndex);
    
    // If switching to overview tab, ensure charts are properly sized and initialized
    if (tabIndex === 0) {
      setTimeout(() => {
        this.ensureChartsInitialized();
        this.resizeCharts();
        // Force another resize after a longer delay to ensure proper positioning
        setTimeout(() => {
          this.resizeCharts();
        }, 300);
      }, 150);
    }
  }

  private loadTabData(tabIndex: number): void {
    switch (tabIndex) {
      case 1: // users
        this.loadUsers();
        break;
      case 2: // stores
        this.loadStores();
        break;
      case 3: // products
        this.loadProducts();
        break;
      case 4: // orders
        this.loadOrders();
        break;
    }
  }

  // User Management
  loadUsers(): void {
    this.adminService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        this.users = users;
        this.applyUserFilters();
      },
      error: (error) => this.handleError('Failed to load users', error)
    });
  }

  applyUserFilters(): void {
    let filtered = this.users.filter(user => {
      const matchesSearch = !this.searchTerm || 
        user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesRole = this.roleFilter === 'all' || 
        user.roles.some(role => role === this.roleFilter);
      
      return matchesSearch && matchesRole;
    });

    // Apply sorting
    if (this.sortField) {
      filtered = this.sortArray(filtered, this.sortField, this.sortDirection);
    }

    this.filteredUsers = filtered;
  }

  addUser(): void {
    if (this.userForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    const formValue = this.userForm.value;
    this.adminService.createUser({
      email: formValue.email,
      password: formValue.password,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      role: 'Admin',
      color: formValue.color,
      avatar: formValue.avatar,
      address: formValue.address
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.snackBar.open('Admin account created successfully', 'Close', { duration: 3000 });
        this.showAddUser = false;
        this.userForm.reset({ isActive: true });
        this.loadUsers();
      },
      error: (error) => {
        this.handleError('Failed to create admin account', error);
      }
    });
  }

  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'deactivate' : 'activate';
    const serviceCall = user.isActive ? 
      this.adminService.deactivateUser(user.id) : 
      this.adminService.activateUser(user.id);

    serviceCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`User ${action}d successfully`, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: (error) => this.handleError(`Failed to ${action} user`, error)
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete user ${user.firstName} ${user.lastName}?`)) {
      this.adminService.deleteUser(user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
          this.loadUsers();
        },
        error: (error) => this.handleError('Failed to delete user', error)
      });
    }
  }

  // Store Management
  loadStores(): void {
    this.adminService.getAllStores().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stores) => {
        this.stores = stores;
        this.applyStoreFilters();
      },
      error: (error) => this.handleError('Failed to load stores', error)
    });
  }

  applyStoreFilters(): void {
    let filtered = this.stores.filter(store => {
      const matchesSearch = !this.searchTerm || 
        store.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        store.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'all' || 
        (this.statusFilter === 'active' && store.isActive) ||
        (this.statusFilter === 'inactive' && !store.isActive);
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    if (this.sortField) {
      filtered = this.sortArray(filtered, this.sortField, this.sortDirection);
    }

    this.filteredStores = filtered;
  }

  toggleStoreStatus(store: Store): void {
    const action = store.isActive ? 'deactivate' : 'activate';
    const serviceCall = store.isActive ? 
      this.adminService.deactivateStore(store.id) : 
      this.adminService.activateStore(store.id);

    serviceCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`Store ${action}d successfully`, 'Close', { duration: 3000 });
        this.loadStores();
      },
      error: (error) => this.handleError(`Failed to ${action} store`, error)
    });
  }

  // Product Management
  loadProducts(): void {
    this.adminService.getAllProducts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (products) => {
        this.products = products;
        this.applyProductFilters();
      },
      error: (error) => this.handleError('Failed to load products', error)
    });
  }

  applyProductFilters(): void {
    let filtered = this.products.filter(product => {
      const matchesSearch = !this.searchTerm || 
        product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'all' || 
        (this.statusFilter === 'active' && product.isActive) ||
        (this.statusFilter === 'inactive' && !product.isActive);
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    if (this.sortField) {
      filtered = this.sortArray(filtered, this.sortField, this.sortDirection);
    }

    this.filteredProducts = filtered;
  }

  toggleProductStatus(product: Product): void {
    const action = product.isActive ? 'deactivate' : 'activate';
    const serviceCall = product.isActive ? 
      this.adminService.deactivateProduct(product.id) : 
      this.adminService.activateProduct(product.id);

    serviceCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`Product ${action}d successfully`, 'Close', { duration: 3000 });
        this.loadProducts();
      },
      error: (error) => this.handleError(`Failed to ${action} product`, error)
    });
  }

  // Order Management
  loadOrders(): void {
    this.adminService.getAllOrders().pipe(takeUntil(this.destroy$)).subscribe({
      next: (orders) => {
        this.orders = orders;
        // Set default sorting for orders (most recent first) only when on orders tab
        if (this.activeTab === 4 && !this.sortField) {
          this.sortField = 'orderDate';
          this.sortDirection = 'desc';
        }
        this.applyOrderFilters();
      },
      error: (error) => this.handleError('Failed to load orders', error)
    });
  }

  applyOrderFilters(): void {
    let filtered = this.orders.filter(order => {
      const matchesSearch = !this.searchTerm || 
        order.customerName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.orderNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'all' || 
        order.status.toLowerCase() === this.statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    if (this.sortField) {
      filtered = this.sortArray(filtered, this.sortField, this.sortDirection);
    }

    this.filteredOrders = filtered;
  }

  // Search and filter event handlers
  onSearchChange(): void {
    switch (this.activeTab) {
      case 1: // users
        this.applyUserFilters();
        break;
      case 2: // stores
        this.applyStoreFilters();
        break;
      case 3: // products
        this.applyProductFilters();
        break;
      case 4: // orders
        this.applyOrderFilters();
        break;
    }
  }

  onFilterChange(): void {
    this.onSearchChange();
  }

  // Sorting methods
  sortData(field: string): void {
    console.log('Sort clicked for field:', field);
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    console.log('New sort field:', this.sortField, 'direction:', this.sortDirection);
    this.onSearchChange();
  }

  onSortChange(): void {
    this.onSearchChange();
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.onSearchChange();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'unfold_more';
    }
    return this.sortDirection === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  private sortArray<T>(array: T[], field: string, direction: 'asc' | 'desc'): T[] {
    return array.sort((a: any, b: any) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle nested properties (e.g., 'customer.name')
      if (field.includes('.')) {
        const parts = field.split('.');
        aValue = parts.reduce((obj, key) => obj?.[key], a);
        bValue = parts.reduce((obj, key) => obj?.[key], b);
      }

      // Handle date sorting
      if (field.includes('Date') || field.includes('date') || field.includes('Created') || field.includes('created')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  selectOrder(order: Order): void {
    this.selectedOrder = order;
  }

  updateOrderStatus(order: Order, status: string): void {
    this.adminService.updateOrderStatus(order.id, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Order status updated successfully', 'Close', { duration: 3000 });
        this.loadOrders();
        // Update the selected order if it's the same one
        if (this.selectedOrder && this.selectedOrder.id === order.id) {
          this.selectedOrder.status = status as any;
        }
      },
      error: (error) => this.handleError('Failed to update order status', error)
    });
  }

  // Utility Methods
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': case 'delivered': case 'paid': return 'green';
      case 'pending': return 'orange';
      case 'accepted': return 'green';
      case 'inactive': return 'red';
      case 'shipped': return 'blue';
      default: return 'gray';
    }
  }

  getRoleColor(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin': return 'red';
      case 'seller': return 'blue';
      case 'customer': return 'green';
      default: return 'gray';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  getImageUrl(imageUrl?: string): string {
    return this.imageService.getImageUrl(imageUrl);
  }

  onImageError(event: any): void {
    // Fallback to user-avatar when image fails to load
    event.target.src = this.imageService.getImageUrl('/uploads/images/user-avatar.png');
  }

  onProductImageError(event: any): void {
    // Fallback to product-default when product image fails to load
    event.target.src = this.imageService.getImageUrl('/uploads/images/product-default.png');
  }

  getProductImageUrl(item: any): string {
    if (item.productImageUrl) {
      return this.imageService.getImageUrl(item.productImageUrl);
    }
    if (item.product && item.product.productImages && item.product.productImages.length > 0) {
      return this.imageService.getImageUrl(item.product.productImages[0].imageUrl);
    }
    return this.imageService.getImageUrl('/uploads/images/product-default.png');
  }

  // Minimap helper: get color for player
  getPlayerColor(player: PlayerState): string {
    // Use their color if set, else fallback
    return player.color || '#1976d2';
  }

  // Minimap helper: get avatar url
  getPlayerAvatar(player: PlayerState): string {
    return this.imageService.getImageUrl(player.avatar || '/uploads/images/user-avatar.png');
  }

  // Highlight logic for minimap
  selectUser(userId: string) {
    if (this.selectedUserId === userId) {
      this.selectedUserId = null;
    } else {
      this.selectedUserId = userId;
    }
  }
  isUserSelected(userId: string): boolean {
    return this.selectedUserId === userId;
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }

  // Navigation
  goToVirtualStreet(): void {
    this.router.navigate(['/virtual-street']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Chart Methods
  private initializeCharts(): void {
    // Only initialize charts if they don't already exist
    if (!this.revenueChart) {
      this.createRevenueChart();
    }
    if (!this.userGrowthChart) {
      this.createUserGrowthChart();
    }
    if (!this.orderStatusChart) {
      this.createOrderStatusChart();
    }
    if (!this.topStoresChart) {
      this.createTopStoresChart();
    }
  }

  private createRevenueChart(): void {
    if (!this.revenueChartRef?.nativeElement) return;

    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Use real data from systemStats if available
    const revenueData = this.systemStats?.revenueHistory || [
      { month: 'Jan', revenue: 12000 },
      { month: 'Feb', revenue: 19000 },
      { month: 'Mar', revenue: 15000 },
      { month: 'Apr', revenue: 25000 },
      { month: 'May', revenue: 22000 },
      { month: 'Jun', revenue: 30000 }
    ];

    const labels = revenueData.map((item: RevenueHistoryItem) => item.month);
    const data = revenueData.map((item: RevenueHistoryItem) => item.revenue);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: data,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    };

    this.revenueChart = new Chart(ctx, config);
  }

  private createUserGrowthChart(): void {
    if (!this.userGrowthChartRef?.nativeElement) return;

    const ctx = this.userGrowthChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Use real data from userStats if available
    const userGrowthData = this.userStats?.userGrowthHistory || [
      { month: 'Jan', newUsers: 45 },
      { month: 'Feb', newUsers: 52 },
      { month: 'Mar', newUsers: 38 },
      { month: 'Apr', newUsers: 67 },
      { month: 'May', newUsers: 58 },
      { month: 'Jun', newUsers: 75 }
    ];

    const labels = userGrowthData.map((item: UserGrowthHistoryItem) => item.month);
    const data = userGrowthData.map((item: UserGrowthHistoryItem) => item.newUsers);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'New Users',
          data: data,
          backgroundColor: '#43e97b',
          borderColor: '#38f9d7',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    this.userGrowthChart = new Chart(ctx, config);
  }

  private createOrderStatusChart(): void {
    if (!this.orderStatusChartRef?.nativeElement) return;

    const ctx = this.orderStatusChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Use real data from orderStats if available
    const orderStatusData = this.orderStats?.orderStatusHistory || [
      { status: 'Pending', count: 12 },
      { status: 'Accepted', count: 8 },
      { status: 'Shipped', count: 19 },
      { status: 'Delivered', count: 8 }
    ];

    const labels = orderStatusData.map((item: OrderStatusHistoryItem) => item.status);
    const data = orderStatusData.map((item: OrderStatusHistoryItem) => item.count);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#ffa726', // Orange for Pending
            '#42a5f5', // Blue for Accepted
            '#7e57c2', // Purple for Shipped
            '#66bb6a'  // Light Green for Delivered
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    this.orderStatusChart = new Chart(ctx, config);
  }

  private createTopStoresChart(): void {
    if (!this.topStoresChartRef?.nativeElement) return;

    const ctx = this.topStoresChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Use real store data to calculate revenue
    const storeRevenue = this.stores.map(store => {
      // Calculate revenue based on store's products and their prices
      const revenue = store.products?.reduce((total: number, product: Product) => {
        return total + product.price;
      }, 0) || 0;
      
      return {
        name: store.name,
        revenue: revenue
      };
    });

    // Sort by revenue and take top 5
    const topStores = storeRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // If no real data, use sample data
    const labels = topStores.length > 0 
      ? topStores.map(store => store.name)
      : ['Store A', 'Store B', 'Store C', 'Store D', 'Store E'];
    
    const data = topStores.length > 0
      ? topStores.map(store => store.revenue)
      : [15000, 12000, 9000, 7500, 6000];

    const chartData = {
      labels: labels,
      datasets: [{
        label: 'Revenue',
        data: data,
        backgroundColor: [
          '#667eea',
          '#f093fb',
          '#4facfe',
          '#43e97b',
          '#fa709a'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };

    const config: ChartConfiguration = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    };

    this.topStoresChart = new Chart(ctx, config);
  }
} 