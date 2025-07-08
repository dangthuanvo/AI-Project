import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-chat-button',
  templateUrl: './chat-button.component.html',
  styleUrls: ['./chat-button.component.scss']
})
export class ChatButtonComponent {
  @Input() storeId?: number;
  @Input() storeName?: string;
  @Input() sellerId?: string;
  @Input() sellerName?: string;
  @Output() chatInitiated = new EventEmitter<void>();

  constructor(private dialog: MatDialog) {}

  openChat(): void {
    this.chatInitiated.emit();
    
    // Open chat in a dialog
    const dialogRef = this.dialog.open(ChatComponent, {
      width: '90vw',
      height: '100vh',
      maxWidth: '1200px',
      maxHeight: '100vh',
      disableClose: false,
      data: {
        storeId: this.storeId,
        storeName: this.storeName,
        sellerId: this.sellerId,
        sellerName: this.sellerName
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      // Handle dialog close if needed
    });
  }
} 