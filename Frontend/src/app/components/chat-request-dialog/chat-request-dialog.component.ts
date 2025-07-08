import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-chat-request-dialog',
  template: `
    <h2 mat-dialog-title>Chat Request</h2>
    <mat-dialog-content>
      <p>{{ data.requesterName }} wants to chat with you.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onRefuse()">Refuse</button>
      <button mat-raised-button color="primary" (click)="onAccept()">Accept</button>
    </mat-dialog-actions>
  `
})
export class ChatRequestDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ChatRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { requesterName: string }
  ) {}

  onAccept() {
    this.dialogRef.close(true);
  }
  onRefuse() {
    this.dialogRef.close(false);
  }
} 