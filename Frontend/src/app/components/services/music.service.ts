import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MusicService {
  // Hardcoded list for now; can be made dynamic later
  private musicFiles: string[] = [
    'track1.mp3',
    'track2.mp3',
    'track3.mp3'
  ];

  getMusicFiles(): string[] {
    return this.musicFiles;
  }

  getMusicFileUrl(filename: string): string {
    // Remove '/api' from apiUrl if present, then append /music/filename
    let base = environment.apiUrl.replace(/\/api$/, '');
    return `${base}/music/${filename}`;
  }
} 