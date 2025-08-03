import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MinigameService } from '../../services/minigame.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface PuzzleTile {
  value: number;
  currentPosition: number;
  isCorrect: boolean;
}

@Component({
  selector: 'app-number-puzzle',
  templateUrl: './number-puzzle.component.html',
  styleUrls: ['./number-puzzle.component.scss']
})
export class NumberPuzzleComponent implements OnInit, OnDestroy {
  tiles: PuzzleTile[] = [];
  size: number = 3; // 3x3 puzzle
  moves: number = 0;
  timeElapsed: number = 0;
  gameCompleted: boolean = false;
  gameActive: boolean = false;
  private timer: any;
  private gameStartTime: number = 0;
  private voucherRewarded = false;

  constructor(
    private dialogRef: MatDialogRef<NumberPuzzleComponent>,
    private minigameService: MinigameService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeGame();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  initializeGame(): void {
    this.tiles = [];
    this.moves = 0;
    this.timeElapsed = 0;
    this.gameCompleted = false;
    this.gameActive = false;
    this.voucherRewarded = false;
    
    // Create tiles for 3x3 puzzle (1-8 + empty space)
    const totalTiles = this.size * this.size - 1; // 8 tiles for 3x3
    for (let i = 0; i < totalTiles; i++) {
      this.tiles.push({
        value: i + 1,
        currentPosition: i,
        isCorrect: false
      });
    }
    
    this.shuffleTiles();
    this.updateCorrectPositions();
  }

  shuffleTiles(): void {
    // Fisher-Yates shuffle
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i].currentPosition, this.tiles[j].currentPosition] = 
      [this.tiles[j].currentPosition, this.tiles[i].currentPosition];
    }
    
    // Ensure puzzle is solvable (check if it's not already solved)
    if (this.isPuzzleSolved()) {
      this.shuffleTiles(); // Reshuffle if already solved
    }
  }

  startGame(): void {
    this.gameActive = true;
    this.gameStartTime = Date.now();
    this.startTimer();
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.timeElapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    }, 1000);
  }

  getTileAtPosition(position: number): PuzzleTile | null {
    return this.tiles.find(tile => tile.currentPosition === position) || null;
  }

  isPositionEmpty(position: number): boolean {
    return !this.tiles.find(tile => tile.currentPosition === position);
  }

  canMoveTile(position: number): boolean {
    if (this.isPositionEmpty(position)) return false;
    
    const emptyPosition = this.getEmptyPosition();
    return this.isAdjacent(position, emptyPosition);
  }

  getEmptyPosition(): number {
    const totalPositions = this.size * this.size;
    for (let i = 0; i < totalPositions; i++) {
      if (this.isPositionEmpty(i)) {
        return i;
      }
    }
    return -1;
  }

  isAdjacent(pos1: number, pos2: number): boolean {
    const row1 = Math.floor(pos1 / this.size);
    const col1 = pos1 % this.size;
    const row2 = Math.floor(pos2 / this.size);
    const col2 = pos2 % this.size;
    
    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
           (Math.abs(col1 - col2) === 1 && row1 === row2);
  }

  moveTile(position: number): void {
    if (!this.canMoveTile(position) || !this.gameActive) return;
    
    const emptyPosition = this.getEmptyPosition();
    const tile = this.getTileAtPosition(position);
    
    if (tile) {
      tile.currentPosition = emptyPosition;
      this.moves++;
      this.updateCorrectPositions();
      
      if (this.isPuzzleSolved()) {
        this.completeGame();
      }
    }
  }

  updateCorrectPositions(): void {
    this.tiles.forEach(tile => {
      tile.isCorrect = tile.currentPosition === tile.value - 1;
    });
  }

  isPuzzleSolved(): boolean {
    return this.tiles.every(tile => tile.currentPosition === tile.value - 1);
  }

  completeGame(): void {
    this.gameCompleted = true;
    this.gameActive = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Reward voucher if puzzle solved
    if (!this.voucherRewarded && this.isPuzzleSolved()) {
      this.voucherRewarded = true;
      this.minigameService.rewardVoucher({
        minigameId: 'number-puzzle',
        difficulty: 'hard'
      }).subscribe({
        next: (res) => {
          this.snackBar.open('Congratulations! You won a 15% discount voucher: ' + res.voucher.code, 'Close', { duration: 8000 });
        },
        error: (err) => {
          this.snackBar.open('Failed to reward voucher: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
        }
      });
    }
  }

  restartGame(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.initializeGame();
  }

  closeGame(): void {
    this.dialogRef.close({
      score: this.calculateScore(),
      moves: this.moves,
      time: this.timeElapsed,
      completed: this.gameCompleted
    });
  }

  calculateScore(): number {
    if (!this.gameCompleted) return 0;
    
    // Base score: 1000 points
    let score = 1000;
    
    // Bonus for fewer moves (max 500 bonus)
    const moveBonus = Math.max(0, 500 - (this.moves * 10));
    score += moveBonus;
    
    // Bonus for faster completion (max 500 bonus)
    const timeBonus = Math.max(0, 500 - (this.timeElapsed * 5));
    score += timeBonus;
    
    return score;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getTileClass(position: number): string {
    const tile = this.getTileAtPosition(position);
    if (!tile) return 'empty';
    
    let classes = 'tile';
    if (tile.isCorrect) classes += ' correct';
    if (this.canMoveTile(position)) classes += ' movable';
    
    return classes;
  }

  trackByPosition(index: number, position: number): number {
    return position;
  }
} 