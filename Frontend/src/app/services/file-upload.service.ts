import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  imageUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = `${environment.apiUrl}/api/fileupload`;

  constructor(private http: HttpClient) { }

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.apiUrl}/image`, formData)
      .pipe(
        map(response => response.imageUrl)
      );
  }

  deleteImage(imageUrl: string): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/image`, { body: imageUrl });
  }
} 