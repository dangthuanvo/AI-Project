import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-memory-match',
  templateUrl: './memory-match.component.html',
  styleUrls: ['./memory-match.component.scss']
})
export class MemoryMatchComponent implements OnInit, OnDestroy {
  cards: Card[] = [];
  flippedCards: Card[] = [];
  score: number = 0;
  moves: number = 0;
  timeElapsed: number = 0;
  gameCompleted: boolean = false;
  private timer: any;
  private gameStartTime: number = 0;

  // Emoji pairs for the memory game
  private emojis: string[] = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭', '🎪', '🎯', '🎲', '🎮', '🎨', '🎭'];

  constructor(private dialogRef: MatDialogRef<MemoryMatchComponent>) {}

  ngOnInit(): void {
    this.initializeGame();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  initializeGame(): void {
    this.cards = [];
    this.flippedCards = [];
    this.score = 0;
    this.moves = 0;
    this.timeElapsed = 0;
    this.gameCompleted = false;

    // Create cards with emoji pairs
    const cardValues = [...this.emojis];
    for (let i = 0; i < cardValues.length; i++) {
      this.cards.push({
        id: i,
        value: cardValues[i],
        isFlipped: false,
        isMatched: false,
        isDisabled: false
      });
    }

    // Shuffle cards
    this.shuffleCards();
    this.startTimer();
  }

  shuffleCards(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  flipCard(card: Card): void {
    if (card.isFlipped || card.isMatched || card.isDisabled || this.flippedCards.length >= 2) {
      return;
    }

    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.checkMatch();
    }
  }

  checkMatch(): void {
    const [card1, card2] = this.flippedCards;
    
    if (card1.value === card2.value) {
      // Match found
      card1.isMatched = true;
      card2.isMatched = true;
      this.score += 10;
      this.flippedCards = [];
      
      // Check if game is completed
      if (this.cards.every(card => card.isMatched)) {
        this.completeGame();
      }
    } else {
      // No match
      setTimeout(() => {
        card1.isFlipped = false;
        card2.isFlipped = false;
        this.flippedCards = [];
      }, 1000);
    }
  }

  startTimer(): void {
    this.gameStartTime = Date.now();
    this.timer = setInterval(() => {
      this.timeElapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    }, 1000);
  }

  completeGame(): void {
    this.gameCompleted = true;
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    // Bonus points for quick completion
    const timeBonus = Math.max(0, 100 - this.timeElapsed);
    this.score += timeBonus;
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
      moves: this.moves,
      time: this.timeElapsed,
      completed: this.gameCompleted
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  trackByCardId(index: number, card: Card): number {
    return card.id;
  }
} 