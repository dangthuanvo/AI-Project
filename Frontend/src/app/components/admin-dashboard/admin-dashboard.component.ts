import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, interval } from 'rxjs';
import { AdminService, User, Store, Product, Order, SystemStats, UserStats, StoreStats, OrderStats, ProductStats } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
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
  editingUser: User | null = null;
  
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

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder,
    public imageService: ImageService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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
      next: (stats) => this.systemStats = stats,
      error: (error) => this.handleError('Failed to load system stats', error)
    });

    this.adminService.getUserStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => this.userStats = stats,
      error: (error) => this.handleError('Failed to load user stats', error)
    });

    this.adminService.getStoreStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => this.storeStats = stats,
      error: (error) => this.handleError('Failed to load store stats', error)
    });

    this.adminService.getOrderStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => this.orderStats = stats,
      error: (error) => this.handleError('Failed to load order stats', error)
    });

    this.adminService.getProductStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.productStats = stats;
        this.loading = false;
      },
      error: (error) => {
        this.handleError('Failed to load product stats', error);
        this.loading = false;
      }
    });
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

  editUser(user: User): void {
    this.editingUser = user;
    this.userForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.roles[0] || 'Customer',
      isActive: user.isActive
    });
  }

  updateUser(): void {
    if (this.userForm.invalid || !this.editingUser) return;

    const userData = this.userForm.value;
    this.adminService.updateUser(this.editingUser.id, userData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
        this.editingUser = null;
        this.userForm.reset();
        this.loadUsers();
      },
      error: (error) => this.handleError('Failed to update user', error)
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

  updateOrderStatus(order: Order, status: string): void {
    this.adminService.updateOrderStatus(order.id, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Order status updated successfully', 'Close', { duration: 3000 });
        this.loadOrders();
      },
      error: (error) => this.handleError('Failed to update order status', error)
    });
  }

  // Utility Methods
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': case 'delivered': case 'paid': return 'green';
      case 'pending': return 'orange';
      case 'inactive': case 'cancelled': return 'red';
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
} 