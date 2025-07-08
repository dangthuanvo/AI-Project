import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Inject, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatService, ChatMessage, ChatConversation, SendMessageRequest } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageService } from '../../services/image.service';
import { StoreService, Product } from '../../services/store.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  chatForm: FormGroup;
  conversations: ChatConversation[] = [];
  messages: ChatMessage[] = [];
  selectedConversation: ChatConversation | null = null;
  currentUser: any = null;
  isTyping = false;
  otherUserTyping = false;
  loading = false;
  unreadCount = 0;
  latestMessagesMap: { [conversationId: number]: ChatMessage } = {};
  productCache: { [id: number]: Product } = {};

  private destroy$ = new Subject<void>();
  private typingTimeout: any;
  private shouldScrollToBottom = true;
  private hasAutoSelected = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private imageService: ImageService,
    private dialogRef: MatDialogRef<ChatComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private storeService: StoreService
  ) {
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Focus message input on component init
    this.focusMessageInput();
    
    // Start chat connection
    const token = this.authService.getToken();
    if (token) {
      this.chatService.startConnection(token).catch(error => {
        console.error('Failed to start chat connection:', error);
        this.snackBar.open('Failed to connect to chat', 'Close', { duration: 3000 });
      });
    }

    // If dialog data has sellerId and storeId, prepare conversation for first-time auto-selection
    if (this.data && this.data.sellerId && this.data.storeId && this.currentUser?.id) {
      this.chatService.initiateConversation(this.currentUser.id, this.data.sellerId, this.data.storeId)
        .subscribe(conversation => {
          // Auto-select the newly created conversation on first time
          if (!this.hasAutoSelected) {
          this.selectConversation(conversation);
            this.hasAutoSelected = true;
          }
          this.chatService.loadConversations();
        });
    }

    // Subscribe to chat data
    this.chatService.conversations$.pipe(takeUntil(this.destroy$)).subscribe(conversations => {
      this.conversations = conversations;
      // Fetch the latest message for each conversation
      conversations.forEach(conversation => {
        const otherUserId = conversation.user1Id === this.currentUser?.id ? conversation.user2Id : conversation.user1Id;
        this.chatService.getMessages(otherUserId, conversation.storeId, 1, 1).subscribe(messages => {
          if (messages && messages.length > 0) {
            this.latestMessagesMap[conversation.id] = messages[0];
          }
        });
      });
      // Auto-select conversation only on first time if dialog data is present and no conversation is selected yet
      if (this.data && this.data.sellerId && this.data.storeId && !this.hasAutoSelected && !this.selectedConversation) {
        const existing = conversations.find(c =>
          ((c.user1Id === this.currentUser?.id && c.user2Id === this.data.sellerId) ||
           (c.user2Id === this.currentUser?.id && c.user1Id === this.data.sellerId)) &&
          c.storeId === this.data.storeId
        );
        if (existing) {
          this.selectConversation(existing);
          this.hasAutoSelected = true; // Mark as auto-selected so it won't happen again
        }
      }
    });

    this.chatService.messages$.pipe(takeUntil(this.destroy$)).subscribe(messages => {
      this.messages = messages;
      this.shouldScrollToBottom = true;
    });

    this.chatService.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.unreadCount = count;
    });

    this.chatService.typing$.pipe(takeUntil(this.destroy$)).subscribe(({ userId, isTyping }) => {
      if (this.selectedConversation) {
        const otherUserId = this.getOtherUserId(this.selectedConversation);
        if (userId === otherUserId) {
          this.otherUserTyping = isTyping;
        }
      }
    });

    this.chatService.newMessage$.pipe(takeUntil(this.destroy$)).subscribe(message => {
      // Update conversations list
      this.chatService.loadConversations();
      
      // If this message is for the current conversation, add it
      if (this.selectedConversation) {
        const otherUserId = this.getOtherUserId(this.selectedConversation);
        const messageOtherUserId = this.getOtherUserIdFromMessage(message);
        
        if (otherUserId === messageOtherUserId) {
          this.chatService.addMessageToConversation(message);
          // Mark as read and refresh conversations if currently viewing
          this.chatService.markAsRead(this.selectedConversation.id).subscribe(() => {
            this.chatService.loadConversations();
          });
          // Only scroll if user is at the bottom
          if (this.isUserAtBottom()) {
            this.shouldScrollToBottom = true;
          }
        }
      }
    });

    // Load initial data
    this.loadConversations();
    this.updateUnreadCount();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.stopConnection();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  loadConversations(): void {
    this.loading = true;
    this.chatService.loadConversations();
    this.loading = false;
  }

  loadMessagesForSelectedConversation(): void {
    if (this.selectedConversation) {
      const otherUserId = this.getOtherUserId(this.selectedConversation);
      this.chatService.loadMessages(otherUserId, this.selectedConversation.storeId);
      this.shouldScrollToBottom = true;
    }
  }

  selectConversation(conversation: ChatConversation): void {
    this.selectedConversation = conversation;
    this.loadMessagesForSelectedConversation();
    // Mark messages as read and refresh conversations
    this.chatService.markAsRead(conversation.id).subscribe(() => {
      this.chatService.loadConversations();
    });
  }

  sendMessage(): void {
    if (this.chatForm.valid && this.selectedConversation) {
      const messageContent = this.chatForm.get('message')?.value;
      const otherUserId = this.getOtherUserId(this.selectedConversation);
      
      const request: SendMessageRequest = {
        receiverId: otherUserId,
        content: messageContent,
        storeId: this.selectedConversation.storeId
      };

      this.chatService.sendMessage(request).then(() => {
        this.chatForm.reset();
        // Always reload messages after sending (especially for new conversations)
        this.loadMessagesForSelectedConversation();
        // Optionally reload conversations as well
        this.chatService.loadConversations();
        this.shouldScrollToBottom = true;
      }).catch(error => {
        console.error('Failed to send message:', error);
        this.snackBar.open('Failed to send message', 'Close', { duration: 3000 });
      });
    }
  }

  private getOtherUserId(conversation: ChatConversation): string {
    return conversation.user1Id === this.currentUser?.id ? conversation.user2Id : conversation.user1Id;
  }

  private getOtherUserIdFromMessage(message: ChatMessage): string {
    return message.senderId === this.currentUser?.id ? message.receiverId : message.senderId;
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private updateUnreadCount(): void {
    this.chatService.updateUnreadCount();
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.senderId === this.currentUser?.id;
  }

  getOtherUserName(conversation: ChatConversation): string {
    return conversation.user1Id === this.currentUser?.id ? conversation.user2Name : conversation.user1Name;
  }

  getOtherUserAvatar(conversation: ChatConversation): string {
    const avatar = conversation.user1Id === this.currentUser?.id ? conversation.user2Avatar : conversation.user1Avatar;
    return this.imageService.getImageUrl(avatar);
  }

  formatMessageTime(date: Date | string): string {
    let dateObj: Date;
    if (typeof date === 'string') {
      // Remove timezone info if present
      const noTZ = date.replace(/([+-][0-9]{2}:?[0-9]{2}|Z)$/i, '');
      dateObj = new Date(noTZ);
      if (isNaN(dateObj.getTime())) {
        // Fallback: try parsing as-is
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatConversationTime(date: Date): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // ESC to close chat
    if (event.key === 'Escape') {
      this.closeChat();
    }
    
    // Ctrl+M to focus message input
    if (event.ctrlKey && event.key === 'm') {
      event.preventDefault();
      this.focusMessageInput();
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  focusMessageInput(): void {
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  closeChat(): void {
    this.dialogRef.close();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/uploads/images/user-avatar.png';
    }
  }

  getLastMessageForSidebar(conversation: ChatConversation): ChatMessage | null {
    if (this.latestMessagesMap[conversation.id]) {
      return this.latestMessagesMap[conversation.id];
    }
    const msgs = this.messages.filter(m =>
      ((m.senderId === conversation.user1Id && m.receiverId === conversation.user2Id) ||
       (m.senderId === conversation.user2Id && m.receiverId === conversation.user1Id)) &&
      m.storeId === conversation.storeId
    );
    return msgs.length ? msgs[msgs.length - 1] : null;
  }

  isLatestFromOtherUser(conversation: ChatConversation): boolean {
    const latest = this.getLastMessageForSidebar(conversation);
    return !!(latest && latest.senderId !== this.currentUser?.id && !latest.isRead);
  }

  private isUserAtBottom(): boolean {
    if (!this.messageContainer) return true;
    const el = this.messageContainer.nativeElement;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50; // 50px threshold
  }

  isProductMessage(content: string): boolean {
    return /^\[PRODUCT:\d+\]$/.test(content);
  }

  extractProductId(content: string): number | null {
    const match = content.match(/^\[PRODUCT:(\d+)\]$/);
    return match ? +match[1] : null;
  }

  onProductCardLoaded(): void {
    this.scrollToBottom();
  }

  getProductForMessage(productId: number): Observable<Product> {
    if (this.productCache[productId]) {
      return new Observable<Product>(observer => {
        observer.next(this.productCache[productId]);
        observer.complete();
      });
    } else {
      return new Observable<Product>(observer => {
        this.storeService.getProduct(productId).subscribe(product => {
          this.productCache[productId] = product;
          observer.next(product);
          observer.complete();
        });
      });
    }
  }

  trackByMessageId(index: number, message: ChatMessage) {
    return message.id;
  }
} 