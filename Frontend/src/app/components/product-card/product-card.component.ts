import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../../services/store.service';
import { ImageService } from '../../services/image.service';
import { StoreService } from '../../services/store.service';
import { RatingService } from '../../services/rating.service';

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

  averageRating: number | null = null;
  ratingsCount: number = 0;

  constructor(
    private router: Router,
    private imageService: ImageService,
    private storeService: StoreService,
    private ratingService: RatingService // Inject RatingService
  ) {}

  ngOnInit(): void {
    if (this.productId && !this.product) {
      this.fetchProduct();
    } else if (this.product) {
      this.loaded.emit();
      this.loadRatings();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.fetchProduct();
    }
    if (changes['product'] && this.product) {
      this.loadRatings();
    }
  }

  fetchProduct(): void {
    this.storeService.getProduct(this.productId!).subscribe(product => {
      this.product = product;
      this.loaded.emit();
      this.loadRatings();
    });
  }

  loadRatings(): void {
    if (!this.product || !this.product.id) {
      this.averageRating = null;
      this.ratingsCount = 0;
      return;
    }
    this.ratingService.getProductRatings(this.product.id).subscribe(ratings => {
      this.ratingsCount = ratings.length;
      if (ratings.length === 0) {
        this.averageRating = null;
      } else {
        const sum = ratings.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
        this.averageRating = +(sum / ratings.length).toFixed(1);
      }
    }, _ => {
      this.averageRating = null;
      this.ratingsCount = 0;
    });
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageService.getImageUrl(imageUrl);
  }

  navigateToProduct(): void {
    this.router.navigate(['/product', this.product.id]);
  }
} 