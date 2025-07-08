import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

export interface PlayerState {
  userId: string;
  name: string;
  avatar: string;
  color: string;
  x: number;
  y: number;
  facing: string;
  isWalking: boolean;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private hubConnection: signalR.HubConnection | null = null;
  private onlineUsersSubject = new BehaviorSubject<string[]>([]);
  onlineUsers$ = this.onlineUsersSubject.asObservable();

  private allPlayerStatesSubject = new BehaviorSubject<PlayerState[]>([]);
  allPlayerStates$ = this.allPlayerStatesSubject.asObservable();

  private playerStateUpdatedSubject = new Subject<PlayerState>();
  playerStateUpdated$ = this.playerStateUpdatedSubject.asObservable();

  private playerLeftSubject = new Subject<string>();
  playerLeft$ = this.playerLeftSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  connectionStatus$ = this.connectionStatusSubject.asObservable();

  private lastActivityTime = Date.now();
  private reconnectOnActivity = false;
  private currentPlayerState: PlayerState | null = null;

  // Performance optimizations
  private updateThrottleTime = 5; // 5ms throttle (200 updates per second)
  private lastUpdateTime = 0;
  private pendingUpdate: PlayerState | null = null;
  private updateTimeout: any = null;
  private lastSentState: PlayerState | null = null;
  private significantChangeThreshold = 1; // 1 pixel instead of 5

  startConnection(token: string) {
    this.connectionStatusSubject.next('connecting');
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7001/hubs/presence', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => {
        this.connectionStatusSubject.next('connected');
      })
      .catch((error) => {
        console.error('Connection failed:', error);
        this.connectionStatusSubject.next('disconnected');
      });

    this.hubConnection.onclose(() => {
      this.connectionStatusSubject.next('disconnected');
      this.reconnectOnActivity = true;
    });

    this.hubConnection.onreconnecting(() => {
      this.connectionStatusSubject.next('connecting');
    });

    this.hubConnection.onreconnected(() => {
      this.connectionStatusSubject.next('connected');
      
      // Send current player state after reconnection to ensure proper tracking
      if (this.currentPlayerState) {
        setTimeout(() => {
          this.hubConnection?.invoke('UpdatePlayerState', this.currentPlayerState);
        }, 100);
      }
    });

    this.hubConnection.on('OnlineUsers', (users: string[]) => {
      this.onlineUsersSubject.next(users);
    });

    this.hubConnection.on('AllPlayerStates', (states: PlayerState[]) => {
      this.allPlayerStatesSubject.next(states);
    });

    this.hubConnection.on('PlayerStateUpdated', (state: PlayerState) => {
      this.playerStateUpdatedSubject.next(state);
    });

    this.hubConnection.on('PlayerLeft', (userId: string) => {
      this.playerLeftSubject.next(userId);
    });

    this.hubConnection.on('OnlineUsersCount', (count: number, users: string[]) => {
      // Removed console.log for performance
    });
  }

  stopConnection() {
    this.hubConnection?.stop();
    this.connectionStatusSubject.next('disconnected');
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }

  forceDisconnect() {
    this.hubConnection?.stop();
    this.connectionStatusSubject.next('disconnected');
    this.reconnectOnActivity = true;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }

  updatePlayerState(state: PlayerState) {
    this.lastActivityTime = Date.now();
    
    // Store the current player state for reconnection
    this.currentPlayerState = { ...state };
    
    // Reduce throttling for smoother movement
    this.updateThrottleTime = 5; // 5ms throttle (200 updates per second)
    
    // Check if this is a significant change
    if (!this.isSignificantChange(state)) {
      return; // Skip insignificant updates
    }
    
    // Send update immediately with less strict throttling
    this.sendUpdate(state);
  }

  private isSignificantChange(newState: PlayerState): boolean {
    if (!this.lastSentState) {
      return true;
    }
    
    const distance = Math.sqrt(
      Math.pow(newState.x - this.lastSentState.x, 2) + 
      Math.pow(newState.y - this.lastSentState.y, 2)
    );
    
    const walkingChanged = newState.isWalking !== this.lastSentState.isWalking;
    const facingChanged = newState.facing !== this.lastSentState.facing;
    
    // Reduce threshold for more frequent updates
    const significantDistanceThreshold = 0.5; // Smaller threshold
    const significantWalkingChange = true; // Always send walking state changes
    
    if (
      distance >= significantDistanceThreshold || 
      (significantWalkingChange && walkingChanged) || 
      facingChanged
    ) {
      console.log('Movement update triggered:', {
        distance,
        walkingChanged,
        facingChanged,
        oldState: this.lastSentState,
        newState
      });
      return true;
    }
    
    return false;
  }

  private sendPendingUpdate(): void {
    if (this.pendingUpdate) {
      this.sendUpdate(this.pendingUpdate);
      this.pendingUpdate = null;
    }
    this.updateTimeout = null;
  }

  private sendUpdate(state: PlayerState): void {
    this.lastUpdateTime = Date.now();
    this.lastSentState = { ...state };
    this.trackActivity();
    this.hubConnection?.invoke('UpdatePlayerState', state);
  }

  private attemptReconnect() {
    if (this.hubConnection && this.connectionStatusSubject.value === 'disconnected') {
      this.connectionStatusSubject.next('connecting');
      
      this.hubConnection.start()
        .then(() => {
          this.connectionStatusSubject.next('connected');
          
          // Send current player state after reconnection to ensure proper tracking
          if (this.currentPlayerState) {
            setTimeout(() => {
              this.hubConnection?.invoke('UpdatePlayerState', this.currentPlayerState);
            }, 100);
          }
        })
        .catch((error) => {
          console.error('Reconnection failed:', error);
          this.connectionStatusSubject.next('disconnected');
          this.reconnectOnActivity = true;
        });
    }
  }

  reconnect() {
    this.attemptReconnect();
  }

  trackActivity() {
    this.lastActivityTime = Date.now();
    
    // If we're disconnected and user is active, try to reconnect
    if (this.reconnectOnActivity) {
      this.reconnectOnActivity = false;
      this.attemptReconnect();
    }
  }

  getOnlineUsersCount() {
    this.hubConnection?.invoke('GetOnlineUsersCount');
  }
} 