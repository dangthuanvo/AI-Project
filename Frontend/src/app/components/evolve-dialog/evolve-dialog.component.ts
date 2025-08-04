import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-evolve-dialog',
  templateUrl: './evolve-dialog.component.html',
  styleUrls: ['./evolve-dialog.component.scss']
})
export class EvolveDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EvolveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { from: string; to: string; evolutionThreshold?: number; totalSpent?: number }
  ) {}

  getPetImage(pet: string): string {
    // Example: 'bulbasaur-1.png' for Bulbasaur, fallback to lowercase.png
    const base = pet.toLowerCase();
    return `assets/${base}-1.png`;
  }

  close(): void {
    this.dialogRef.close();
  }
}
