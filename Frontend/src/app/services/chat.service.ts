import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
  readAt?: Date;
  storeId?: number;
  storeName?: string;
}

export interface ChatConversation {
  id: number;
  user1Id: string;
  user1Name: string;
  user1Avatar: string;
  user2Id: string;
  user2Name: string;
  user2Avatar: string;
  createdAt: Date;
  lastMessageAt: Date;
  lastMessageContent: string;
  unreadCount: number;
  storeId?: number;
  storeName?: string;
}

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  storeId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = `${environment.apiUrl}`;
  private hubConnection?: HubConnection;
  
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private typingSubject = new Subject<{ userId: string; isTyping: boolean }>();
  private newMessageSubject = new Subject<ChatMessage>();

  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();
  public newMessage$ = this.newMessageSubject.asObservable();

  constructor(private http: HttpClient) {}

  startConnection(token: string): Promise<void> {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl.replace('/api', '')}/hubs/chat`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.setupSignalRHandlers();

    return this.hubConnection.start();
  }

  stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }

  private setupSignalRHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
      this.newMessageSubject.next(message);
      this.updateUnreadCount();
    });

    this.hubConnection.on('MessageSent', (message: ChatMessage) => {
      // Add message to current conversation if it's the active one
      const currentMessages = this.messagesSubject.value;
      if (currentMessages.length > 0) {
        const currentUserId = this.getCurrentUserId();
        
        // Check if this message belongs to the current conversation
        const messageOtherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
        const currentOtherUserId = this.getOtherUserId(currentMessages[0]);
        
        if (messageOtherUserId === currentOtherUserId) {
          // Add the message to the current conversation
          this.messagesSubject.next([...currentMessages, message]);
        }
      }
    });

    this.hubConnection.on('UserTyping', (userId: string, isTyping: boolean) => {
      this.typingSubject.next({ userId, isTyping });
    });

    this.hubConnection.on('MessagesRead', (conversationId: number, userId: string) => {
      // Update read status for messages
      const currentMessages = this.messagesSubject.value;
      const updatedMessages = currentMessages.map(msg => 
        msg.senderId === userId ? { ...msg, isRead: true, readAt: new Date() } : msg
      );
      this.messagesSubject.next(updatedMessages);
    });
  }

  private getOtherUserId(message: ChatMessage): string {
    // Get current user ID from localStorage or auth service
    const currentUserId = localStorage.getItem('userId') || this.getCurrentUserId();
    
    // Return the other user's ID (not the current user)
    return message.senderId === currentUserId ? message.receiverId : message.senderId;
  }

  private getCurrentUserId(): string {
    // This should get the current user ID from your auth service
    // For now, we'll try to get it from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user).id;
      } catch {
        return '';
      }
    }
    return '';
  }

  getConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.API_URL}/chat/conversations`);
  }

  getMessages(otherUserId: string, storeId?: number, page: number = 1, pageSize: number = 50): Observable<ChatMessage[]> {
    let url = `${this.API_URL}/chat/messages/${otherUserId}?page=${page}&pageSize=${pageSize}`;
    if (storeId) {
      url += `&storeId=${storeId}`;
    }
    return this.http.get<ChatMessage[]>(url);
  }

  async sendMessage(request: SendMessageRequest): Promise<void> {
    if (!this.hubConnection) {
      return Promise.reject('Chat connection not established');
    }
    // Wait for connection if not connected
    if (this.hubConnection.state !== HubConnectionState.Connected) {
      try {
        await this.hubConnection.start();
      } catch (err) {
        return Promise.reject('Failed to connect to chat server');
      }
    }
    return this.hubConnection.invoke('SendMessage', request.receiverId, request.content, request.storeId);
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/chat/mark-read`, { conversationId });
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/chat/unread-count`);
  }

  updateUnreadCount(): void {
    this.getUnreadCount().subscribe(count => {
      this.unreadCountSubject.next(count);
    });
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean): Promise<void> {
    if (!this.hubConnection) {
      return Promise.reject('Chat connection not established');
    }
    
    return this.hubConnection.invoke('Typing', receiverId, isTyping);
  }

  setCurrentConversation(messages: ChatMessage[]): void {
    this.messagesSubject.next(messages);
  }

  addMessageToConversation(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, message]);
  }

  getStoreCustomers(storeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/chat/store-customers/${storeId}`);
  }

  loadConversations(): void {
    this.getConversations().subscribe(conversations => {
      this.conversationsSubject.next(conversations);
    });
  }

  loadMessages(otherUserId: string, storeId?: number): void {
    this.getMessages(otherUserId, storeId).subscribe(messages => {
      // Sort messages from oldest to newest
      const sorted = messages.slice().sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      this.messagesSubject.next(sorted);
    });
  }

  initiateConversation(userId1: string, userId2: string, storeId?: number) {
    return this.http.post<ChatConversation>(`${this.API_URL}/chat/conversation/initiate`, {
      userId1,
      userId2,
      storeId
    });
  }

  waitForConnection(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // --- User-to-user chat request logic ---
  sendChatRequest(targetUserId: string, requesterName: string): Promise<void> {
    if (!this.hubConnection) return Promise.reject('No connection');
    return this.hubConnection.invoke('SendChatRequest', targetUserId, this.getCurrentUserId(), requesterName);
  }

  onReceiveChatRequest(callback: (requesterId: string, requesterName: string) => void) {
    if (!this.hubConnection) return;
    this.hubConnection.on('ReceiveChatRequest', callback);
  }

  sendChatRequestResponse(requesterId: string, accepted: boolean) {
    if (!this.hubConnection) return;
    this.hubConnection.invoke('ChatRequestResponse', requesterId, accepted);
  }

  onChatRequestResponse(callback: (requesterId: string, accepted: boolean) => void) {
    if (!this.hubConnection) return;
    this.hubConnection.on('ChatRequestResponse', callback);
  }

  isConnected(): boolean {
    return this.hubConnection != null && this.hubConnection.state === HubConnectionState.Connected;
  }
} 