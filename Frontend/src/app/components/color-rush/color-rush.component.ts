import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

interface ColorOption {
  name: string;
  hex: string;
  displayName: string;
}

@Component({
  selector: 'app-color-rush',
  templateUrl: './color-rush.component.html',
  styleUrls: ['./color-rush.component.scss']
})
export class ColorRushComponent implements OnInit, OnDestroy {
  score: number = 0;
  timeLeft: number = 60; // 60 seconds game
  currentRound: number = 1;
  maxRounds: number = 30;
  gameActive: boolean = false;
  gameCompleted: boolean = false;
  roundCompleted: boolean = false;
  
  targetColor: ColorOption | null = null;
  colorOptions: ColorOption[] = [];
  correctAnswers: number = 0;
  wrongAnswers: number = 0;
  averageReactionTime: number = 0;
  totalReactionTime: number = 0;
  roundStartTime: number = 0;
  
  private timer: any;
  private roundTimer: any;
  private gameStartTime: number = 0;

  // Color definitions
  private colors: ColorOption[] = [
    { name: 'red', hex: '#ff4757', displayName: 'Red' },
    { name: 'blue', hex: '#3742fa', displayName: 'Blue' },
    { name: 'green', hex: '#2ed573', displayName: 'Green' },
    { name: 'yellow', hex: '#ffa502', displayName: 'Yellow' },
    { name: 'purple', hex: '#a55eea', displayName: 'Purple' },
    { name: 'orange', hex: '#ff6348', displayName: 'Orange' },
    { name: 'pink', hex: '#ff6b9d', displayName: 'Pink' },
    { name: 'cyan', hex: '#00d2d3', displayName: 'Cyan' }
  ];

  constructor(private dialogRef: MatDialogRef<ColorRushComponent>) {}

  ngOnInit(): void {
    this.initializeGame();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  initializeGame(): void {
    this.score = 0;
    this.timeLeft = 60;
    this.currentRound = 1;
    this.gameActive = false;
    this.gameCompleted = false;
    this.roundCompleted = false;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.averageReactionTime = 0;
    this.totalReactionTime = 0;
    this.targetColor = null;
    this.colorOptions = [];
  }

  startGame(): void {
    this.gameActive = true;
    this.gameStartTime = Date.now();
    this.startTimer();
    this.startNewRound();
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  startNewRound(): void {
    if (this.currentRound > this.maxRounds || this.timeLeft <= 0) {
      this.endGame();
      return;
    }

    this.roundCompleted = false;
    this.roundStartTime = Date.now();
    
    // Select target color
    this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    // Create color options (3 options, including the target)
    this.colorOptions = this.generateColorOptions();
    
    // Auto-advance to next round after 3 seconds if no answer
    this.roundTimer = setTimeout(() => {
      if (!this.roundCompleted) {
        this.handleAnswer(null);
      }
    }, 3000);
  }

  generateColorOptions(): ColorOption[] {
    const options: ColorOption[] = [this.targetColor!];
    
    // Add 2 random different colors
    while (options.length < 3) {
      const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
      if (!options.find(opt => opt.name === randomColor.name)) {
        options.push(randomColor);
      }
    }
    
    // Shuffle the options
    return this.shuffleArray(options);
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  handleAnswer(selectedColor: ColorOption | null): void {
    if (this.roundCompleted) return;
    
    this.roundCompleted = true;
    clearTimeout(this.roundTimer);
    
    const reactionTime = Date.now() - this.roundStartTime;
    this.totalReactionTime += reactionTime;
    
    if (selectedColor && selectedColor.name === this.targetColor!.name) {
      // Correct answer
      this.correctAnswers++;
      const roundScore = Math.max(10, 50 - Math.floor(reactionTime / 100));
      this.score += roundScore;
    } else {
      // Wrong answer or timeout
      this.wrongAnswers++;
      this.score = Math.max(0, this.score - 5);
    }
    
    this.averageReactionTime = this.totalReactionTime / (this.correctAnswers + this.wrongAnswers);
    
    // Wait 1 second before next round
    setTimeout(() => {
      this.currentRound++;
      this.startNewRound();
    }, 1000);
  }

  endGame(): void {
    this.gameActive = false;
    this.gameCompleted = true;
    this.clearTimers();
  }

  clearTimers(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
  }

  restartGame(): void {
    this.clearTimers();
    this.initializeGame();
  }

  closeGame(): void {
    this.dialogRef.close({
      score: this.score,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      averageReactionTime: this.averageReactionTime,
      timeLeft: this.timeLeft,
      completed: this.gameCompleted
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatReactionTime(ms: number): string {
    return `${ms}ms`;
  }
} 