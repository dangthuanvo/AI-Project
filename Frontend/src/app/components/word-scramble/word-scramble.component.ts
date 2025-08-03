import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MinigameService } from '../../services/minigame.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface WordPuzzle {
  word: string;
  scrambled: string;
  hint: string;
  category: string;
}

@Component({
  selector: 'app-word-scramble',
  templateUrl: './word-scramble.component.html',
  styleUrls: ['./word-scramble.component.scss']
})
export class WordScrambleComponent implements OnInit, OnDestroy {
  currentPuzzle: WordPuzzle | null = null;
  userAnswer: string = '';
  score: number = 0;
  currentRound: number = 1;
  maxRounds: number = 10;
  timeLeft: number = 60; // 60 seconds per round
  gameActive: boolean = false;
  gameCompleted: boolean = false;
  roundCompleted: boolean = false;
  correctAnswers: number = 0;
  wrongAnswers: number = 0;
  hintsUsed: number = 0;
  showHint: boolean = false;
  
  private timer: any;
  private gameStartTime: number = 0;
  private voucherRewarded = false;

  // Word puzzles with hints
  private wordPuzzles: WordPuzzle[] = [
    { word: 'COMPUTER', scrambled: 'MOCPUTER', hint: 'Electronic device for processing data', category: 'Technology' },
    { word: 'ELEPHANT', scrambled: 'LEEPHANT', hint: 'Large gray animal with a trunk', category: 'Animals' },
    { word: 'MOUNTAIN', scrambled: 'UNMOATIN', hint: 'High natural elevation of land', category: 'Geography' },
    { word: 'BUTTERFLY', scrambled: 'TTERFLUBY', hint: 'Colorful flying insect', category: 'Animals' },
    { word: 'SUNSHINE', scrambled: 'HUNSINES', hint: 'Bright light from the sun', category: 'Nature' },
    { word: 'BASKETBALL', scrambled: 'SKETBALLA', hint: 'Sport with orange ball and hoop', category: 'Sports' },
    { word: 'CHOCOLATE', scrambled: 'HOCLATEOC', hint: 'Sweet brown treat', category: 'Food' },
    { word: 'LIBRARY', scrambled: 'LIBRARY', hint: 'Place with many books', category: 'Education' },
    { word: 'RAINBOW', scrambled: 'AINBROW', hint: 'Colorful arc in the sky', category: 'Nature' },
    { word: 'TREASURE', scrambled: 'REASURET', hint: 'Hidden valuable items', category: 'Adventure' },
    { word: 'DOLPHIN', scrambled: 'LPHINDO', hint: 'Intelligent sea mammal', category: 'Animals' },
    { word: 'VOLCANO', scrambled: 'CANOVOL', hint: 'Mountain that can erupt', category: 'Geography' },
    { word: 'DIAMOND', scrambled: 'MANDIOD', hint: 'Precious gemstone', category: 'Jewelry' },
    { word: 'SUNFLOWER', scrambled: 'FLOWERSUN', hint: 'Tall yellow flower that follows the sun', category: 'Plants' },
    { word: 'TELESCOPE', scrambled: 'SCOPETELE', hint: 'Device for viewing distant objects', category: 'Science' }
  ];

  private usedPuzzles: Set<string> = new Set();

  constructor(
    private dialogRef: MatDialogRef<WordScrambleComponent>,
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
    this.score = 0;
    this.currentRound = 1;
    this.timeLeft = 60;
    this.gameActive = false;
    this.gameCompleted = false;
    this.roundCompleted = false;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.hintsUsed = 0;
    this.showHint = false;
    this.userAnswer = '';
    this.currentPuzzle = null;
    this.usedPuzzles.clear();
    this.voucherRewarded = false;
  }

  startGame(): void {
    this.gameActive = true;
    this.gameStartTime = Date.now();
    this.startNewRound();
  }

  startNewRound(): void {
    if (this.currentRound > this.maxRounds) {
      this.endGame();
      return;
    }

    this.roundCompleted = false;
    this.showHint = false;
    this.userAnswer = '';
    this.timeLeft = 60;
    this.startTimer();
    this.selectNewPuzzle();
  }

  selectNewPuzzle(): void {
    const availablePuzzles = this.wordPuzzles.filter(puzzle => !this.usedPuzzles.has(puzzle.word));
    
    if (availablePuzzles.length === 0) {
      // Reset used puzzles if all have been used
      this.usedPuzzles.clear();
    }
    
    const randomPuzzle = availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];
    this.currentPuzzle = randomPuzzle;
    this.usedPuzzles.add(randomPuzzle.word);
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.handleAnswer();
      }
    }, 1000);
  }

  useHint(): void {
    if (!this.showHint && this.currentPuzzle) {
      this.showHint = true;
      this.hintsUsed++;
      this.score = Math.max(0, this.score - 10); // Penalty for using hint
    }
  }

  submitAnswer(): void {
    if (this.userAnswer.trim()) {
      this.handleAnswer();
    }
  }

  handleAnswer(): void {
    if (this.roundCompleted) return;
    
    this.roundCompleted = true;
    clearInterval(this.timer);
    
    const isCorrect = this.userAnswer.trim().toUpperCase() === this.currentPuzzle!.word;
    
    if (isCorrect) {
      this.correctAnswers++;
      const timeBonus = Math.max(10, this.timeLeft * 2);
      this.score += 50 + timeBonus;
    } else {
      this.wrongAnswers++;
      this.score = Math.max(0, this.score - 5);
    }
    
    // Wait 2 seconds before next round
    setTimeout(() => {
      this.currentRound++;
      this.startNewRound();
    }, 2000);
  }

  endGame(): void {
    this.gameActive = false;
    this.gameCompleted = true;
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Reward voucher if all answers correct
    if (!this.voucherRewarded && this.correctAnswers === this.maxRounds) {
      this.voucherRewarded = true;
      this.minigameService.rewardVoucher({
        minigameId: 'word-scramble',
        difficulty: 'medium'
      }).subscribe({
        next: (res) => {
          this.snackBar.open('Congratulations! You won a 10% discount voucher: ' + res.voucher.code, 'Close', { duration: 8000 });
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
      score: this.score,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      hintsUsed: this.hintsUsed,
      completed: this.gameCompleted
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.gameActive && !this.roundCompleted) {
      this.submitAnswer();
    }
  }

  getAccuracy(): number {
    const total = this.correctAnswers + this.wrongAnswers;
    return total > 0 ? (this.correctAnswers / total) * 100 : 0;
  }

  trackByLetter(index: number, letter: string): string {
    return letter;
  }

  getTimeBonus(): number {
    return Math.max(10, this.timeLeft * 2);
  }
} 