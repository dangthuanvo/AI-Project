import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../../services/store.service';
import { ImageService } from '../../services/image.service';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit, OnChanges {
  @Input() product!: Product;
  @Input() productId?: number;
  @Input() clickable: boolean = true;
  @Output() loaded = new EventEmitter<void>();

  constructor(
    private router: Router,
    private imageService: ImageService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    if (this.productId && !this.product) {
      this.fetchProduct();
    } else if (this.product) {
      this.loaded.emit();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.fetchProduct();
    }
  }

  fetchProduct(): void {
    this.storeService.getProduct(this.productId!).subscribe(product => {
      this.product = product;
      this.loaded.emit();
    });
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }

  navigateToProduct(): void {
    this.router.navigate(['/product', this.product.id]);
  }
} 