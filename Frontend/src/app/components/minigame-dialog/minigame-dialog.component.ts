import { Component, Inject, OnInit } from '@angular/core';
import { VoucherService } from '../../services/voucher.service';
import { UserVoucher } from '../../models/voucher.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface Minigame {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  isAvailable: boolean;
}

@Component({
  selector: 'app-minigame-dialog',
  templateUrl: './minigame-dialog.component.html',
  styleUrls: ['./minigame-dialog.component.scss']
})
export class MinigameDialogComponent implements OnInit {
  // --- imports moved above ---
  minigames: Minigame[] = [
    {
      id: 'memory-match',
      name: 'Memory Match',
      description: 'Find matching pairs of cards. Test your memory skills!',
      icon: 'extension',
      difficulty: 'easy',
      estimatedTime: '2-3 minutes',
      isAvailable: true
    },
    {
      id: 'color-rush',
      name: 'Color Rush',
      description: 'Click the correct color as fast as you can!',
      icon: 'palette',
      difficulty: 'medium',
      estimatedTime: '1-2 minutes',
      isAvailable: true
    },
    {
      id: 'number-puzzle',
      name: 'Number Puzzle',
      description: 'Arrange numbers in the correct order to solve the puzzle.',
      icon: 'grid_on',
      difficulty: 'hard',
      estimatedTime: '3-5 minutes',
      isAvailable: true
    },
    {
      id: 'word-scramble',
      name: 'Word Scramble',
      description: 'Unscramble letters to form words. Expand your vocabulary!',
      icon: 'text_fields',
      difficulty: 'medium',
      estimatedTime: '2-4 minutes',
      isAvailable: true
    }
  ];

  userVouchers: UserVoucher[] = [];

  constructor(
    public dialogRef: MatDialogRef<MinigameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private voucherService: VoucherService
  ) {}

  ngOnInit(): void {
    this.voucherService.getUserVouchers().subscribe(vouchers => {
      this.userVouchers = vouchers;
      const today = new Date().toISOString().slice(0, 10);
      console.log('All user vouchers:', this.userVouchers);
      const todaysVouchers = this.userVouchers.filter(v => v.createdAt.slice(0, 10) === today);
      console.log(`Today's vouchers:`, todaysVouchers);
      this.minigames.forEach(game => {
        const blockingVoucher = this.userVouchers.find(v =>
          v.minigameId === game.id && v.createdAt.slice(0, 10) === today
        );
        const played = !!blockingVoucher;
        game.isAvailable = !played;
        if (played) {
          console.log(`Minigame '${game.name}' (id: ${game.id}) is NOT playable today. Blocking voucher:`, blockingVoucher);
        } else {
          console.log(`Minigame '${game.name}' (id: ${game.id}) is playable today.`);
        }
      });
      console.log('All minigames availability:', this.minigames.map(g => ({id: g.id, isAvailable: g.isAvailable})));
    });
  }

  selectGame(game: Minigame): void {
    if (game.isAvailable) {
      this.dialogRef.close(game);
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'hard': return '#f44336';
      default: return '#757575';
    }
  }
} 