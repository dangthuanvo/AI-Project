import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';

// Components
import { AppComponent } from './app.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { VirtualStreetComponent } from './components/virtual-street/virtual-street.component';
import { StoreDetailComponent } from './components/store-detail/store-detail.component';
import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { SellerDashboardComponent } from './components/seller-dashboard/seller-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { StoreCardComponent } from './components/store-card/store-card.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { ProfileDialogComponent } from './components/profile-dialog/profile-dialog.component';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking.component';
import { ChatComponent } from './components/chat/chat.component';
import { ChatButtonComponent } from './components/chat-button/chat-button.component';
import { ShippingAddressCardComponent } from './components/checkout/shipping-address-card.component';
import { ShippingAddressDialogComponent } from './components/checkout/shipping-address-dialog.component';
import { ChatRequestDialogComponent } from './components/chat-request-dialog/chat-request-dialog.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { MinigameDialogComponent } from './components/minigame-dialog/minigame-dialog.component';
import { MemoryMatchComponent } from './components/memory-match/memory-match.component';
import { ColorRushComponent } from './components/color-rush/color-rush.component';
import { NumberPuzzleComponent } from './components/number-puzzle/number-puzzle.component';
import { WordScrambleComponent } from './components/word-scramble/word-scramble.component';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';

// Services
import { AuthService } from './services/auth.service';
import { StoreService } from './services/store.service';
import { CartService } from './services/cart.service';
import { AdminService } from './services/admin.service';
import { OrderService } from './services/order.service';
import { ChatService } from './services/chat.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    VirtualStreetComponent,
    StoreDetailComponent,
    ShoppingCartComponent,
    CheckoutComponent,
    SellerDashboardComponent,
    AdminDashboardComponent,
    ProductCardComponent,
    StoreCardComponent,
    ProductDetailComponent,
    ProfileDialogComponent,
    OrderTrackingComponent,
    ChatComponent,
    ChatButtonComponent,
    ShippingAddressCardComponent,
    ShippingAddressDialogComponent,
    ChatRequestDialogComponent,
    ForgotPasswordComponent,
    MinigameDialogComponent,
    MemoryMatchComponent,
    ColorRushComponent,
    NumberPuzzleComponent,
    WordScrambleComponent,
    SplashScreenComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule.forRoot([
      { path: '', redirectTo: '/login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'splash', component: SplashScreenComponent, canActivate: [AuthGuard] },
      { path: 'virtual-street', component: VirtualStreetComponent, canActivate: [AuthGuard] },
      { path: 'store/:id', component: StoreDetailComponent, canActivate: [AuthGuard] },
      { path: 'cart', component: ShoppingCartComponent, canActivate: [AuthGuard] },
      { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] },
      { path: 'seller-dashboard', component: SellerDashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { role: 'Seller' } },
      { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { role: 'Admin' } },
      { path: 'product/:id', component: ProductDetailComponent, canActivate: [AuthGuard] },
      { path: 'order-tracking', component: OrderTrackingComponent, canActivate: [AuthGuard] },
      { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] }
    ]),
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatBadgeModule,
    MatChipsModule,
    MatSelectModule,
    MatSliderModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDividerModule,
    MatRadioModule,
    MatTooltipModule,
    MatExpansionModule,
    MatListModule,
    MatGridListModule,
    NgChartsModule,
    LeafletModule
  ],
  providers: [
    AuthService,
    StoreService,
    CartService,
    AdminService,
    OrderService,
    ChatService,
    AuthGuard,
    RoleGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { } 