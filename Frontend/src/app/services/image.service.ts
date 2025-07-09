import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = environment.apiUrl;
  private staticUrl = environment.apiUrl.replace('/api', '');

  /**
   * Converts a relative image URL to a full URL
   * @param imageUrl The relative image URL (e.g., /uploads/images/filename.jpg)
   * @returns The full image URL
   */
  getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return `${this.staticUrl}/uploads/images/product-default.png`;
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's a relative path, prepend the API URL
    if (imageUrl.startsWith('/')) {
      return `${this.staticUrl}${imageUrl}`;
    }

    // If it doesn't start with /, assume it's relative to uploads
    return `${this.staticUrl}/uploads/${imageUrl}`;
  }

  /**
   * Gets a placeholder image URL
   * @returns Placeholder image URL
   */
  getPlaceholderUrl(): string {
    return `${this.staticUrl}/uploads/images/product-default.png`;
  }
} 