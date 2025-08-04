import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: './pet-selection-dialog.component.html',
  styleUrls: ['./pet-selection-dialog.component.scss']
})
export class PetSelectionDialogComponent {
  pets = [
    { name: 'Bulbasaur', value: 'bulbasaur', image: 'assets/bulbasaur-1.png' },
    { name: 'Charmander', value: 'charmander', image: 'assets/charmander-1.png' },
    { name: 'Squirtle', value: 'squirtle', image: 'assets/squirtle-1.png' },
    { name: 'Dratini', value: 'dratini', image: 'assets/dratini-1.png' }
  ];

  selectedPet: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<PetSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  selectPet(pet: string) {
    this.selectedPet = pet;
  }

  confirmSelection() {
    if (this.selectedPet) {
      this.dialogRef.close(this.selectedPet);
    }
  }
}
