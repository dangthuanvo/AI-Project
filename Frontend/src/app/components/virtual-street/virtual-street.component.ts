import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ProfileDialogComponent } from '../profile-dialog/profile-dialog.component';
import { ImageService } from '../../services/image.service';
import { PresenceService, PlayerState } from '../../services/presence.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChatService } from '../../services/chat.service';
import { ChatRequestDialogComponent } from '../chat-request-dialog/chat-request-dialog.component';
import { ChatComponent } from '../chat/chat.component';

interface Player {
  name: string;
  avatar: string;
  x: number;
  y: number;
  facing: string;
  isWalking: boolean;
  color?: string;
}

interface NPC {
  name: string;
  x: number;
  y: number;
  type: string;
}

interface GameStore {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  positionX: number;
  positionY: number;
  isActive: boolean;
  ownerId: string;
  ownerName: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Decoration {
  type: string;
  x: number;
  y: number;
  size?: number;
  direction?: string;
  color?: string;
}

@Component({
  selector: 'app-virtual-street',
  templateUrl: './virtual-street.component.html',
  styleUrls: ['./virtual-street.component.scss']
})
export class VirtualStreetComponent implements OnInit, OnDestroy {
  player: Player = {
    name: 'Player',
    avatar: 'assets/player-avatar.png',
    x: 100,
    y: 300,
    facing: 'down',
    isWalking: false,
    color: '#1976d2'
  };

  stores: GameStore[] = [];
  npcs: NPC[] = [];
  decorations: Decoration[] = [];
  showMenu = false;
  cameraX = 0;
  cameraY = 0;
  roadLength = 2000;
  updatedStoreIds: Set<number> = new Set();
  
  private moveSpeed = 6; // Increased from 5 to 7 for faster movement
  private keys: { [key: string]: boolean } = {};
  private animationFrame: number | null = null;
  private previousWalkingState = false;
  private lastNetworkUpdate = 0;
  private networkUpdateInterval = 200; // Send updates every 80ms (12.5fps) for faster updates
  profileDialogOpen = false;
  private lastStorePosition: { x: number; y: number } | null = null;
  onlineUsers: string[] = [];
  otherPlayers: { [userId: string]: PlayerState } = {};
  private myUserId: string | null = null;
  isNight: boolean = false;
  starPositions: { top: number, left: number }[] = [];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  private playerUpdateTimers: { [userId: string]: number } = {};
  private playerLastPositions: { [userId: string]: { x: number; y: number; timestamp: number } } = {};
  private playerAnimationStates: { [userId: string]: { isWalking: boolean; lastChange: number; animationStartTime: number; cycleCount: number } } = {};
  private playerVelocities: { [userId: string]: { vx: number; vy: number; timestamp: number } } = {};
  private updateBuffer: { [userId: string]: PlayerState[] } = {};
  private animationLock: { [userId: string]: boolean } = {};
  private animationCycleDuration = 0; // 100ms per animation cycle
  
  // Global search properties
  showSearchModal = false;
  searchQuery = '';
  searchResults: Array<{store: GameStore, productName: string, productId: number, productDescription: string}> = [];
  currentSearchIndex = 0;
  isSearching = false;
  private birdInterval: any = null;
  userIdsInChatRange: string[] = [];
  usersCloseToMe: string[] = [];

  constructor(
    private storeService: StoreService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    public imageService: ImageService,
    private presenceService: PresenceService,
    private snackBar: MatSnackBar,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    this.restorePlayerPosition();
    this.loadStores();
    this.loadPlayerData();
    this.startGameLoop();
    this.generateStars();
    this.generateDecorations();
    this.animateBirds();
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.player.name = user.firstName || user.email || 'Player';
        this.player.color = (user as any).color;
        this.player.avatar = (user as any).avatar ? (user as any).avatar : '/uploads/images/user-avatar.png';
        this.myUserId = user.id;
        this.previousWalkingState = this.player.isWalking;
        // Send initial state to the hub with delay to avoid spam
        setTimeout(() => {
          if (this.myUserId) {
            this.presenceService.updatePlayerState({
              userId: this.myUserId,
              name: this.player.name,
              avatar: this.player.avatar,
              color: this.player.color || '#1976d2',
              x: this.player.x,
              y: this.player.y,
              facing: this.player.facing,
              isWalking: this.player.isWalking
            });
          }
        }, 1000);
      }
    });
    // Add a hardcoded test user for rendering debug (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    this.otherPlayers = {
      'test-id': {
        userId: 'test-id',
        name: 'Test User',
        avatar: '',
        color: '#ff0000',
        x: 200,
        y: 200,
        facing: 'down',
        isWalking: false
      }
    };
    console.log('otherPlayers after hardcoded test:', this.otherPlayers);
    }
    this.presenceService.onlineUsers$.subscribe(users => {
      this.onlineUsers = users;
    });
    this.presenceService.allPlayerStates$.subscribe(states => {
      // Debug log
      console.log('Received all player states:', states);
      const updatedOtherPlayers: { [userId: string]: PlayerState } = {};
      for (const state of states) {
        if (state.userId !== this.myUserId) {
          // Get current state to check for movement
          const currentState = this.otherPlayers[state.userId];
          if (currentState) {
            // Check if this is a significant position change
            const distance = Math.sqrt(
              Math.pow(state.x - currentState.x, 2) + 
              Math.pow(state.y - currentState.y, 2)
            );
            
            // If position hasn't changed significantly, force walking to false
            if (distance < 1) {
              updatedOtherPlayers[state.userId] = {
                ...state,
                isWalking: false
              };
              console.log(`Player ${state.name} is stationary in allPlayerStates (distance: ${distance.toFixed(2)})`);
            } else {
          updatedOtherPlayers[state.userId] = state;
            }
          } else {
            // New player, use state as-is
          updatedOtherPlayers[state.userId] = state;
          }
        }
      }
      this.otherPlayers = { ...updatedOtherPlayers };
    });
    this.presenceService.playerStateUpdated$.subscribe(state => {
      if (state.userId !== this.myUserId) {
        // Buffer the update for smoother processing
        if (!this.updateBuffer[state.userId]) {
          this.updateBuffer[state.userId] = [];
        }
        this.updateBuffer[state.userId].push(state);
        
        // Keep only the last 3 updates to prevent buffer overflow
        if (this.updateBuffer[state.userId].length > 3) {
          this.updateBuffer[state.userId] = this.updateBuffer[state.userId].slice(-3);
        }
        
        // Get the current state of this player
        const currentPlayerState = this.otherPlayers[state.userId] || state;
        
        // Check if this is a significant position change
        const distance = Math.sqrt(
          Math.pow(state.x - currentPlayerState.x, 2) + 
          Math.pow(state.y - currentPlayerState.y, 2)
        );
        
        // Clear any existing timer for this player
        if (this.playerUpdateTimers[state.userId]) {
          clearTimeout(this.playerUpdateTimers[state.userId]);
        }
        
        // Track the last position and timestamp
        this.playerLastPositions[state.userId] = {
          x: state.x,
          y: state.y,
          timestamp: Date.now()
        };
        
        // Initialize animation state if not exists
        if (!this.playerAnimationStates[state.userId]) {
          this.playerAnimationStates[state.userId] = {
            isWalking: false,
            lastChange: 0,
            animationStartTime: 0,
            cycleCount: 0
          };
        }
        
        // Determine if we should change the walking state
        const shouldChangeWalking = this.shouldChangeWalkingState(state.userId, state.isWalking, distance);
        
        // If the position hasn't changed significantly, treat as stationary
        if (distance < 1) {
          const stoppedState = {
            ...state,
            isWalking: false
          };
          const updatedOtherPlayers = { ...this.otherPlayers };
          updatedOtherPlayers[state.userId] = stoppedState;
          this.otherPlayers = updatedOtherPlayers;
          
          // Update animation state
          if (this.playerAnimationStates[state.userId].isWalking) {
            this.playerAnimationStates[state.userId] = {
              isWalking: false,
              lastChange: Date.now(),
              animationStartTime: 0,
              cycleCount: 0
            };
          }
          
          console.log(`Player ${state.name} is stationary (distance: ${distance.toFixed(2)}), animation disabled`);
        } else {
          // Only interpolate if there's actual movement
        const interpolatedState = this.interpolatePlayerMovement(currentPlayerState, state);
          
          // Apply walking state change if needed
          if (shouldChangeWalking) {
            interpolatedState.isWalking = state.isWalking;
            this.playerAnimationStates[state.userId] = {
              isWalking: state.isWalking,
              lastChange: Date.now(),
              animationStartTime: state.isWalking ? Date.now() : 0,
              cycleCount: state.isWalking ? 1 : 0
            };
          } else {
            // Check if we should complete the current animation cycle
            if (this.playerAnimationStates[state.userId].isWalking && !state.isWalking) {
              if (this.shouldCompleteAnimationCycle(state.userId)) {
                // Allow stopping after completing a cycle
                interpolatedState.isWalking = false;
                this.playerAnimationStates[state.userId].isWalking = false;
                this.playerAnimationStates[state.userId].lastChange = Date.now();
                this.playerAnimationStates[state.userId].animationStartTime = 0;
                this.playerAnimationStates[state.userId].cycleCount = 0;
                console.log(`Animation cycle completed for player ${state.userId}, stopping walking`);
              } else {
                // Keep walking until cycle completes
                interpolatedState.isWalking = true;
                console.log(`Keeping animation running for player ${state.userId} until cycle completes`);
              }
            } else {
              // Keep the current animation state
              interpolatedState.isWalking = this.playerAnimationStates[state.userId].isWalking;
            }
          }
        
        // Update other players with interpolated state
        const updatedOtherPlayers = { ...this.otherPlayers };
        updatedOtherPlayers[state.userId] = interpolatedState;
        this.otherPlayers = updatedOtherPlayers;
        
        console.log(`Interpolated movement for ${state.name}:`, interpolatedState);
          
          // Set a timer to stop animation if no updates are received for 2 seconds
          if (state.isWalking) {
            this.playerUpdateTimers[state.userId] = window.setTimeout(() => {
              const currentPlayer = this.otherPlayers[state.userId];
              if (currentPlayer && currentPlayer.isWalking) {
                const stoppedState = {
                  ...currentPlayer,
                  isWalking: false
                };
                const updatedOtherPlayers = { ...this.otherPlayers };
                updatedOtherPlayers[state.userId] = stoppedState;
                this.otherPlayers = updatedOtherPlayers;
                
                // Update animation state
                this.playerAnimationStates[state.userId] = {
                  isWalking: false,
                  lastChange: Date.now(),
                  animationStartTime: 0,
                  cycleCount: 0
                };
                
                console.log(`Player ${state.name} animation stopped due to timeout`);
              }
            }, 2000);
          }
        }
      }
    });
    this.presenceService.playerLeft$.subscribe(userId => {
      delete this.otherPlayers[userId];
      // Clean up timer for this player
      if (this.playerUpdateTimers[userId]) {
        clearTimeout(this.playerUpdateTimers[userId]);
        delete this.playerUpdateTimers[userId];
      }
      // Clean up position tracking
      delete this.playerLastPositions[userId];
      // Clean up animation state
      delete this.playerAnimationStates[userId];
      // Clean up velocity tracking
      delete this.playerVelocities[userId];
      // Clean up update buffer
      delete this.updateBuffer[userId];
      // Clean up animation lock
      delete this.animationLock[userId];
    });
    
    // Subscribe to connection status
    this.presenceService.connectionStatus$.subscribe(status => {
      this.connectionStatus = status;
      
      // Send initial state when connected
      if (status === 'connected' && this.myUserId) {
        this.sendInitialPlayerState();
      }
    });
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // Listen for incoming chat requests
    this.chatService.onReceiveChatRequest((requesterId: string, requesterName: string) => {
      const dialogRef = this.dialog.open(ChatRequestDialogComponent, {
        data: { requesterName },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(accepted => {
        this.chatService.sendChatRequestResponse(requesterId, accepted);
        if (accepted) {
          this.openChatWithUser(requesterId);
        }
      });
    });
    // Listen for chat request responses
    this.chatService.onChatRequestResponse((requesterId: string, accepted: boolean) => {
      if (accepted) {
        this.openChatWithUser(requesterId);
      } else {
        this.snackBar.open('User refused to chat.', 'Close', { duration: 3000 });
      }
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    this.savePlayerPosition();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    // Clean up all player update timers
    Object.values(this.playerUpdateTimers).forEach(timerId => {
      clearTimeout(timerId);
    });
    this.playerUpdateTimers = {};
    this.playerLastPositions = {};
    this.playerAnimationStates = {};
    this.playerVelocities = {};
    this.updateBuffer = {};
    this.animationLock = {};
    if (this.birdInterval) {
      clearInterval(this.birdInterval);
    }
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    // Track user activity for reconnection
    this.presenceService.trackActivity();
    
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    const key = event.key.toLowerCase();
    
    // Handle escape key for search modal only
    if (key === 'escape' && this.showSearchModal) {
      this.closeSearchModal();
      return;
    }
    
    // Handle global search shortcut (Ctrl+F only)
    if (event.ctrlKey && key === 'f') {
      event.preventDefault();
      this.openSearchModal();
      return;
    }
    
    // Disable movement and other game controls when search modal is open
    if (this.showSearchModal) {
      return;
    }
    
    if (key === 'e') {
      // Find if player is near any store
      const nearbyStore = this.stores.find(store => this.isNearStore(store));
      if (nearbyStore) {
        console.log('E pressed, entering store:', nearbyStore);
        this.enterStore(nearbyStore);
        event.preventDefault();
        return;
      }
    }
    // Movement keys
    if ([
      'w', 'a', 's', 'd',
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright'
    ].includes(key)) {
      event.preventDefault();
      this.keys[key] = true;
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    // Track user activity for reconnection
    this.presenceService.trackActivity();
    
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    
    // Disable movement key processing when search modal is open
    if (this.showSearchModal) {
      return;
    }
    
    const key = event.key.toLowerCase();
    this.keys[key] = false;
    
    if (!this.isAnyMovementKeyPressed()) {
      this.player.isWalking = false;
      // Send state update when player stops walking
      if (this.myUserId && this.previousWalkingState !== this.player.isWalking) {
        console.log(`Sending state update on keyup - Walking: ${this.player.isWalking}`);
        this.sendNetworkUpdate();
      }
    }
  }

  private isAnyMovementKeyPressed(): boolean {
    return this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'] ||
           this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright'];
  }

  private startGameLoop(): void {
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;
    
    const gameLoop = (currentTime: number) => {
      this.animationFrame = requestAnimationFrame(gameLoop);
      
      // Limit FPS to reduce CPU usage
      if (currentTime - lastTime < frameInterval) {
        return;
      }
      lastTime = currentTime;
      
      // Only update if there's movement or significant changes
      const hasMovement = this.isAnyMovementKeyPressed();
      if (hasMovement) {
        this.updatePlayerMovement();
        this.updateCamera();
      } else {
        // Still update camera for smooth following
        this.updateCamera();
      }
      
      // Check and stop stationary animations
      this.checkAndStopStationaryAnimations();

      // Make birds fly away if player is near
      const birds = this.decorations.filter(d => d.type === 'bird');
      const playerWidth = 48;
      const playerHeight = 64;
      const birdWidth = 40;
      const birdHeight = 24;
      const minX = 0;
      const maxX = this.roadLength - birdWidth;
      const minY = 0;
      const maxY = 400 - birdHeight;
      birds.forEach(bird => {
        const dx = (this.player.x + playerWidth / 2) - (bird.x + birdWidth / 2);
        const dy = (this.player.y + playerHeight / 2) - (bird.y + birdHeight / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 60) { // If player is close to bird
          // Make bird fly rapidly away from player
          const angle = Math.atan2(dy, dx) + Math.PI; // Opposite direction
          const flyDistance = 180 + Math.random() * 60;
          let newX = bird.x + Math.cos(angle) * flyDistance;
          let newY = bird.y + Math.sin(angle) * flyDistance;
          newX = Math.max(minX, Math.min(newX, maxX));
          newY = Math.max(minY, Math.min(newY, maxY));
          bird.direction = (newX < bird.x) ? 'left' : 'right';
          bird.x = newX;
          bird.y = newY;
        }
      });
      
      // Check proximity to other users for chat
      this.userIdsInChatRange = [];
      const playerCenter = { x: this.player.x + 24, y: this.player.y + 32 };
      for (const [userId, other] of Object.entries(this.otherPlayers)) {
        if (userId === this.myUserId) continue;
        const otherCenter = { x: other.x + 24, y: other.y + 32 };
        const dist = Math.sqrt(
          Math.pow(playerCenter.x - otherCenter.x, 2) +
          Math.pow(playerCenter.y - otherCenter.y, 2)
        );
        if (dist < 20) {
          this.userIdsInChatRange.push(userId);
        }
      }
      
      // Check which users are close to the current player (for drawing buttons above player)
      this.usersCloseToMe = [];
      const myCenter = { x: this.player.x + 24, y: this.player.y + 32 };
      for (const [userId, other] of Object.entries(this.otherPlayers)) {
        const otherCenter = { x: other.x + 24, y: other.y + 32 };
        const dist = Math.sqrt(
          Math.pow(myCenter.x - otherCenter.x, 2) +
          Math.pow(myCenter.y - otherCenter.y, 2)
        );
        if (dist < 20) {
          this.usersCloseToMe.push(userId);
        }
      }
      
      // Process buffered updates for smoother movement
      this.processBufferedUpdates();
    };
    gameLoop(0);
  }

  private updatePlayerMovement(): void {
    const oldX = this.player.x;
    const oldY = this.player.y;
    const oldFacing = this.player.facing;
    let moved = false;

    // Movement logic
    if (this.keys['w'] || this.keys['arrowup']) {
      this.player.y -= this.moveSpeed;
      this.player.facing = 'up';
      this.player.isWalking = true;
      moved = true;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      this.player.y += this.moveSpeed;
      this.player.facing = 'down';
      this.player.isWalking = true;
      moved = true;
    }
    if (this.keys['a'] || this.keys['arrowleft']) {
      this.player.x -= this.moveSpeed;
      this.player.facing = 'left';
      this.player.isWalking = true;
      moved = true;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      this.player.x += this.moveSpeed;
      this.player.facing = 'right';
      this.player.isWalking = true;
      moved = true;
    }

    // Stop walking if no movement keys are pressed
    if (!moved) {
      this.player.isWalking = false;
    }

    // Restrict player to street boundaries
    const playerWidth = 48;  // SVG width
    const playerHeight = 64; // SVG height
    const minX = 0;
    const maxX = this.roadLength - playerWidth;
    const minY = 0;
    const maxY = 400 - playerHeight;

    this.player.x = Math.max(minX, Math.min(this.player.x, maxX));
    this.player.y = Math.max(minY, Math.min(this.player.y, maxY));

    // Send network updates at a consistent rate when moving
    this.sendNetworkUpdateIfNeeded(moved, oldX, oldY, oldFacing);
  }

  private sendNetworkUpdateIfNeeded(moved: boolean, oldX: number, oldY: number, oldFacing: string): void {
    const now = Date.now();
    
    // Always send if walking state changed
    if (this.player.isWalking !== this.previousWalkingState) {
      this.sendNetworkUpdate();
      return;
    }
    
    // Send if facing direction changed
    if (this.player.facing !== oldFacing) {
      this.sendNetworkUpdate();
      return;
    }
    
    // Send regular updates when moving at a consistent rate
    if (moved && (now - this.lastNetworkUpdate >= this.networkUpdateInterval)) {
      this.sendNetworkUpdate();
      this.lastNetworkUpdate = now;
    }
    
    // Send when stopping movement
    if (!moved && this.previousWalkingState) {
      this.sendNetworkUpdate();
    }
  }

  private sendNetworkUpdate(): void {
    if (!this.myUserId) return;
    
      this.previousWalkingState = this.player.isWalking;
      this.presenceService.updatePlayerState({
        userId: this.myUserId,
        name: this.player.name,
        avatar: this.player.avatar,
        color: this.player.color || '#1976d2',
        x: this.player.x,
        y: this.player.y,
        facing: this.player.facing,
        isWalking: this.player.isWalking
      });
  }

  private shouldSendUpdate(moved: boolean, oldX: number, oldY: number, oldFacing: string): boolean {
    // Always send if walking state changed
    if (this.player.isWalking !== this.previousWalkingState) {
      return true;
    }
    
    // Send if position changed significantly (more than 3 pixels)
    const distance = Math.sqrt(
      Math.pow(this.player.x - oldX, 2) + Math.pow(this.player.y - oldY, 2)
    );
    
    // Send if facing direction changed
    const facingChanged = this.player.facing !== oldFacing;
    
    return distance >= 3 || facingChanged;
  }

  private updateCamera(): void {
    // Center camera on player
    const targetX = -(this.player.x - window.innerWidth / 2);
    const targetY = -(this.player.y - window.innerHeight / 2);
    
    // Smooth camera movement
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraY += (targetY - this.cameraY) * 0.1;
  }

  isNearStore(store: GameStore): boolean {
    // Door is centered horizontally at the bottom of the house
    const houseWidth = 160;
    const wallHeight = 120; // match your wall height in CSS
    const doorX = store.positionX + houseWidth / 2;
    const doorY = store.positionY + wallHeight;
    const distance = Math.sqrt(
      Math.pow(this.player.x - doorX, 2) +
      Math.pow(this.player.y - doorY, 2)
    );
    return distance < 36; // adjust as needed for your game feel
  }

  enterStore(store: GameStore): void {
    this.savePlayerPosition();
    // Store the player's current position before entering the store
    this.lastStorePosition = { x: this.player.x, y: this.player.y };
    
    // Store this information in sessionStorage for persistence across navigation
    sessionStorage.setItem('lastStorePosition', JSON.stringify(this.lastStorePosition));
    sessionStorage.setItem('lastStoreId', store.id.toString());
    
    this.router.navigate(['/store', store.id]);
  }

  get nearbyStoreName(): string {
    const nearbyStore = this.stores.find(store => this.isNearStore(store));
    return nearbyStore?.name || 'No store nearby';
  }



  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  goToOrderTracking(): void {
    this.router.navigate(['/order-tracking']);
  }

  goToProfile(): void {
    this.profileDialogOpen = true;
    this.authService.getProfile().subscribe(user => {
      const dialogRef = this.dialog.open(ProfileDialogComponent, {
        width: '400px',
        data: {
          firstName: user?.firstName,
          lastName: user?.lastName,
          color: (user && user.color != null) ? user.color : '#1976d2',
          avatar: user?.avatar || 'assets/player-avatar.png'
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        this.profileDialogOpen = false;
        if (result) {
          this.authService.setUserColor(result.color);
          this.authService.setUserAvatar(result.avatar);
        }
      });
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadStores(): void {
    this.storeService.getVirtualStreet().subscribe({
      next: (response: any) => {
        const storeWidth = 160;
        const storeSpacing = 60;
        const totalStores = response.stores.length;
        const totalStoresWidth = totalStores * storeWidth + (totalStores - 1) * storeSpacing;
        this.roadLength = Math.max(800, totalStoresWidth + 200); // 200px margin
        const roadCenter = this.roadLength / 2;
        const storesStartX = roadCenter - totalStoresWidth / 2;

        this.stores = response.stores.map((store: any, index: number) => ({
          ...store,
          positionX: storesStartX + index * (storeWidth + storeSpacing),
          positionY: 50,
          // Ensure colors have defaults
          primaryColor: store.primaryColor || '#000000',
          secondaryColor: store.secondaryColor || '#FFFFFF'
        }));

        this.generateDecorations();
        console.log(`Loaded ${this.stores.length} stores, road length: ${this.roadLength}px`);
        
        // Check for return from store after stores are loaded
        this.checkForReturnFromStore();
      },
      error: (error: any) => {
        console.error('Error loading stores from database:', error);
        this.stores = [];
        this.roadLength = 800;
        this.generateDecorations();
        
        // Check for return from store even if stores failed to load
        this.checkForReturnFromStore();
      }
    });
  }

  // Public method to refresh stores (can be called when stores are updated)
  refreshStores(): void {
    this.loadStores();
  }

  // Method to handle navigation back to virtual street from a store
  onNavigateToVirtualStreet(): void {
    // This will be called when the user clicks the "Virtual Street" button in the toolbar
    // The checkForReturnFromStore method will handle the positioning
    this.checkForReturnFromStore();
  }

  // Method to highlight a store that has been updated
  highlightUpdatedStore(storeId: number): void {
    this.updatedStoreIds.add(storeId);
    // Remove the highlight after 3 seconds
    setTimeout(() => {
      this.updatedStoreIds.delete(storeId);
    }, 3000);
  }

  private generateDecorations(): void {
    this.decorations = [];
    if (this.roadLength <= 0) return;

    // For each store, generate a tree and a lamp
    this.stores.forEach(store => {
      // Tree to the left of the store
      this.decorations.push({
        type: 'tree',
        x: store.positionX - 40, // 40px to the left
        y: 50
      });
      // Lamp to the right of the store
      this.decorations.push({
        type: 'street-lamp',
        x: store.positionX + 180 + 2, // 20px to the right of the store's right edge
        y: -50
      });
    });
    // Always add three birds (blue, red, green)
    this.spawnBird('blue');
    this.spawnBird('red');
    this.spawnBird('green');
    // Debug
    setTimeout(() => {
      console.log('Decorations after generateDecorations:', this.decorations);
    }, 1000);
  }

  private loadPlayerData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.player.name = user.firstName || user.email || 'Player';
      if ((user as any).color) {
        this.player.color = (user as any).color;
      }
      this.player.avatar = (user && (user as any).avatar) ? (user as any).avatar : '/uploads/images/user-avatar.png';
    }
  }

  getAvatarUrl(): string {
    return this.imageService.getImageUrl(this.player.avatar);
  }

  onAvatarError() {
    this.player.avatar = '/uploads/images/user-avatar.png';
  }

  private checkForReturnFromStore(): void {
    // Check if we're returning from a store
    const lastStorePosition = sessionStorage.getItem('lastStorePosition');
    const lastStoreId = sessionStorage.getItem('lastStoreId');
    
    if (lastStorePosition && lastStoreId) {
      try {
        const position = JSON.parse(lastStorePosition);
        const storeId = parseInt(lastStoreId);
        
        // Find the store to get its door position
        const store = this.stores.find(s => s.id === storeId);
        if (store) {
          // Calculate the door position
          const houseWidth = 160;
          const wallHeight = 120;
          const doorX = store.positionX + houseWidth / 2;
          const doorY = store.positionY + wallHeight;
          
          // Set player position at the store door
          this.player.x = doorX - 24;
          this.player.y = doorY;
          
          // Clear the stored position
          sessionStorage.removeItem('lastStorePosition');
          sessionStorage.removeItem('lastStoreId');
          
          console.log(`Spawned player at store door: ${store.name} (${doorX}, ${doorY})`);
        }
      } catch (error) {
        console.error('Error parsing stored position:', error);
        sessionStorage.removeItem('lastStorePosition');
        sessionStorage.removeItem('lastStoreId');
      }
    }
  }

  private savePlayerPosition() {
    sessionStorage.setItem('lastPlayerPosition', JSON.stringify({ x: this.player.x, y: this.player.y }));
  }

  private restorePlayerPosition() {
    const pos = sessionStorage.getItem('lastPlayerPosition');
    if (pos) {
      const { x, y } = JSON.parse(pos);
      this.player.x = x;
      this.player.y = y;
    }
  }

  toggleNight() {
    this.isNight = !this.isNight;
    if (this.isNight) {
      this.generateStars();
    }
  }

  generateStars() {
    this.starPositions = [];
    for (let i = 0; i < 50; i++) {
      this.starPositions.push({
        top: Math.random() * 60 + 10,
        left: Math.random() * 100
      });
    }
  }

  testReconnection() {
    console.log('Manual reconnection test triggered');
    this.presenceService.reconnect();
  }

  testDisconnection() {
    console.log('Manual disconnection test triggered');
    this.presenceService.forceDisconnect();
  }

  testOnlineUsersCount() {
    console.log('Getting online users count from server...');
    this.presenceService.getOnlineUsersCount();
  }

  testWalkingAnimation() {
    console.log('Testing walking animation...');
    this.player.isWalking = !this.player.isWalking;
    console.log('Player walking state:', this.player.isWalking);
    
    if (this.myUserId) {
      this.sendNetworkUpdate();
    }
  }

  getDarkerColor(color: string): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken by 30%
    const darkenFactor = 0.7;
    const darkerR = Math.floor(r * darkenFactor);
    const darkerG = Math.floor(g * darkenFactor);
    const darkerB = Math.floor(b * darkenFactor);
    
    // Convert back to hex
    return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
  }

  // Global search methods
  private searchDebounceTimer: any = null;
  private isComposing = false;

  openSearchModal(): void {
    this.showSearchModal = true;
    this.isSearching = false;
    this.isComposing = false;
    
    // Auto-focus the search input after modal opens
    setTimeout(() => {
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100); // Small delay to ensure modal is rendered
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.currentSearchIndex = 0;
    this.isSearching = false;
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    // Don't clear search query and results - preserve them for when user reopens
    this.isComposing = false;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  onSearchInput(): void {
    // Clear any existing debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Don't search if currently composing (for unicode/IME input)
    if (this.isComposing) {
      return;
    }
    
    // Debounce the search to prevent rapid successive calls
    this.searchDebounceTimer = setTimeout(() => {
      this.searchProducts();
    }, 300); // 300ms debounce
  }

  onCompositionStart(): void {
    this.isComposing = true;
  }

  onCompositionEnd(): void {
    this.isComposing = false;
    // Trigger search after composition ends
    this.onSearchInput();
  }

  async searchProducts(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    // Prevent multiple simultaneous searches
    if (this.isSearching) {
      return;
    }

    this.isSearching = true;
    this.searchResults = []; // Clear results before searching

    try {
      // Search through all stores
      for (const store of this.stores) {
        try {
          // Get products for this store
          const products = await this.storeService.getStoreProducts(store.id).toPromise();
          if (products && products.length > 0) {
            // Filter products that match the search query
            const matchingProducts = products.filter(product => 
              product.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
            
            // Add matching products to results
            matchingProducts.forEach(product => {
              this.searchResults.push({
                store: store,
                productName: product.name,
                productId: product.id,
                productDescription: product.description || 'No description available'
              });
            });
          }
        } catch (error) {
          console.error(`Error searching products in store ${store.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error during global search:', error);
    } finally {
      this.isSearching = false;
    }
  }

  navigateToStore(store: GameStore): void {
    // Calculate store door position
    const houseWidth = 160;
    const wallHeight = 120;
    const doorX = store.positionX + houseWidth / 2;
    const doorY = store.positionY + wallHeight;
    
    // Move player to store door
    this.player.x = doorX - 24; // Center player on door
    this.player.y = doorY;
    
    // Ensure player is not walking after teleportation
    this.player.isWalking = false;
    
    // Send immediate SignalR update for real-time position
    this.sendNetworkUpdate();
    
    // Close search modal
    this.closeSearchModal();
    
    console.log(`Navigated to store: ${store.name} at position (${this.player.x}, ${this.player.y}) - SignalR update sent`);
  }

  navigateToNextResult(): void {
    if (this.searchResults.length === 0) return;
    
    this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
    const result = this.searchResults[this.currentSearchIndex];
    this.navigateToStore(result.store);
  }

  handleSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.searchResults.length > 0) {
        this.navigateToNextResult();
      } else {
        this.searchProducts();
      }
    } else if (event.key === 'Escape') {
      this.closeSearchModal();
    }
  }

  private sendInitialPlayerState() {
    if (!this.myUserId) return;
    
    this.sendNetworkUpdate();
  }

  private interpolatePlayerMovement(currentState: PlayerState, newState: PlayerState): PlayerState {
    const now = Date.now();
    const distance = Math.sqrt(
      Math.pow(newState.x - currentState.x, 2) + 
      Math.pow(newState.y - currentState.y, 2)
    );
    
    // If the distance is very small, consider the player stationary
    const isStationary = distance < 1;
    
    let interpolatedState: PlayerState;
    
    if (isStationary) {
      // Player is stationary, use exact position and force walking to false
      interpolatedState = {
      ...newState,
        x: newState.x,
        y: newState.y,
        isWalking: false
      };
      
      // Clear velocity when stationary
      if (this.playerVelocities[newState.userId]) {
        this.playerVelocities[newState.userId] = { vx: 0, vy: 0, timestamp: now };
      }
      
      console.log(`Player ${newState.name} is stationary in interpolation (distance: ${distance.toFixed(2)})`);
    } else {
      // Calculate velocity for smoother movement
      const timeDiff = now - (this.playerVelocities[newState.userId]?.timestamp || now);
      const vx = timeDiff > 0 ? (newState.x - currentState.x) / timeDiff * 16 : 0; // 16ms = 60fps
      const vy = timeDiff > 0 ? (newState.y - currentState.y) / timeDiff * 16 : 0;
      
      // Update velocity
      this.playerVelocities[newState.userId] = { vx, vy, timestamp: now };
      
      // Use adaptive interpolation based on velocity
      const speed = Math.sqrt(vx * vx + vy * vy);
      const interpolationFactor = Math.min(0.4, Math.max(0.2, speed / 10)); // Adaptive factor
      
      // Apply velocity prediction for smoother movement
      const predictedX = currentState.x + (newState.x - currentState.x) * interpolationFactor;
      const predictedY = currentState.y + (newState.y - currentState.y) * interpolationFactor;
      
      interpolatedState = {
        ...currentState,
        x: predictedX,
        y: predictedY,
        facing: newState.facing,
        isWalking: newState.isWalking && distance > 1.5 // Lower threshold for smoother transitions
      };
      
      console.log(`Player ${newState.name} is moving (distance: ${distance.toFixed(2)}, speed: ${speed.toFixed(2)}, walking: ${interpolatedState.isWalking})`);
    }

    return interpolatedState;
  }

  private shouldChangeWalkingState(userId: string, newWalkingState: boolean, distance: number): boolean {
    const currentState = this.playerAnimationStates[userId];
    const now = Date.now();
    const minChangeInterval = 50; // Reduced to 50ms for very responsive changes
    const animationLockDuration = 200; // Lock animation for 200ms after starting
    
    // If the current state is the same, no change needed
    if (currentState.isWalking === newWalkingState) {
      return false;
    }
    
    // Check if animation is locked (prevents rapid toggling)
    if (this.animationLock[userId]) {
      const timeSinceStart = now - currentState.animationStartTime;
      if (timeSinceStart < animationLockDuration) {
        console.log(`Animation locked for player ${userId} (${timeSinceStart}ms since start)`);
        return false;
      }
    }
    
    // If we're trying to change too quickly, prevent it
    if (now - currentState.lastChange < minChangeInterval) {
      console.log(`Preventing rapid walking state change for player ${userId} (${now - currentState.lastChange}ms since last change)`);
      return false;
    }
    
    // If distance is very small, only allow stopping walking
    if (distance < 0.3 && newWalkingState) {
      console.log(`Preventing walking start for stationary player ${userId}`);
      return false;
    }
    
    // Allow immediate stopping of walking
    if (!newWalkingState) {
      this.animationLock[userId] = false; // Release lock when stopping
      return true;
    }
    
    // For starting walking, require some movement and lock animation
    if (distance > 0.3) {
      this.animationLock[userId] = true; // Lock animation when starting
      return true;
    }
    
    return false;
  }

  private shouldCompleteAnimationCycle(userId: string): boolean {
    const currentState = this.playerAnimationStates[userId];
    if (!currentState.isWalking) return false;
    
    const now = Date.now();
    const timeSinceStart = now - currentState.animationStartTime;
    const completedCycles = Math.floor(timeSinceStart / this.animationCycleDuration);
    
    // If we haven't completed at least one full cycle, don't stop
    if (completedCycles < 1) {
      console.log(`Animation cycle not complete for player ${userId} (${timeSinceStart}ms, ${completedCycles} cycles)`);
      return false;
    }
    
    // Update cycle count
    currentState.cycleCount = completedCycles;
    return true;
  }

  private processBufferedUpdates(): void {
    Object.keys(this.updateBuffer).forEach(userId => {
      const updates = this.updateBuffer[userId];
      if (updates.length > 0) {
        // Process the most recent update
        const latestUpdate = updates[updates.length - 1];
        const currentState = this.otherPlayers[userId];
        
        if (currentState) {
          // Apply the update with interpolation
          const interpolatedState = this.interpolatePlayerMovement(currentState, latestUpdate);
          
          // Preserve animation state during position updates, but check for cycle completion
          if (this.playerAnimationStates[userId] && this.playerAnimationStates[userId].isWalking) {
            if (latestUpdate.isWalking) {
              // Keep walking if the latest update says we should be walking
              interpolatedState.isWalking = true;
            } else {
              // Check if we should complete the animation cycle
              if (this.shouldCompleteAnimationCycle(userId)) {
                interpolatedState.isWalking = false;
                this.playerAnimationStates[userId].isWalking = false;
                this.playerAnimationStates[userId].lastChange = Date.now();
                this.playerAnimationStates[userId].animationStartTime = 0;
                this.playerAnimationStates[userId].cycleCount = 0;
                console.log(`Buffered update: Animation cycle completed for player ${userId}, stopping walking`);
              } else {
                // Keep walking until cycle completes
                interpolatedState.isWalking = true;
                console.log(`Buffered update: Keeping animation running for player ${userId} until cycle completes`);
              }
            }
          }
          
          // Update the player state
          const updatedOtherPlayers = { ...this.otherPlayers };
          updatedOtherPlayers[userId] = interpolatedState;
          this.otherPlayers = updatedOtherPlayers;
        }
        
        // Clear the buffer for this player
        this.updateBuffer[userId] = [];
      }
    });
  }

  private checkAndStopStationaryAnimations(): void {
    const now = Date.now();
    const stationaryThreshold = 1000; // 1 second
    
    Object.keys(this.otherPlayers).forEach(userId => {
      const player = this.otherPlayers[userId];
      const lastPosition = this.playerLastPositions[userId];
      
      if (player && lastPosition && player.isWalking) {
        const timeSinceLastMove = now - lastPosition.timestamp;
        const distance = Math.sqrt(
          Math.pow(player.x - lastPosition.x, 2) + 
          Math.pow(player.y - lastPosition.y, 2)
        );
        
        // If player hasn't moved significantly for more than 1 second, check if we can stop animation
        if (timeSinceLastMove > stationaryThreshold && distance < 1) {
          // Only stop if animation cycle is complete
          if (this.shouldCompleteAnimationCycle(userId)) {
            const stoppedState = {
              ...player,
              isWalking: false
            };
            const updatedOtherPlayers = { ...this.otherPlayers };
            updatedOtherPlayers[userId] = stoppedState;
            this.otherPlayers = updatedOtherPlayers;
            
            // Update animation state
            this.playerAnimationStates[userId] = {
              isWalking: false,
              lastChange: now,
              animationStartTime: 0,
              cycleCount: 0
            };
            
            console.log(`Player ${player.name} animation stopped due to being stationary for ${timeSinceLastMove}ms (cycle completed)`);
          } else {
            console.log(`Player ${player.name} is stationary but animation cycle not complete, keeping animation running`);
          }
        }
      }
    });
  }

  private spawnBird(color: string): void {
    const x = Math.random() * (window.innerWidth - 60) + 20;
    const y = Math.random() * 200 + 20;
    this.decorations.push({ type: 'bird', x, y, direction: 'right', color });
  }

  private animateBirds(): void {
    this.birdInterval = setInterval(() => {
      const birds = this.decorations.filter(d => d.type === 'bird');
      birds.forEach(bird => {
        const angle = Math.random() * 2 * Math.PI;
        const distance = 60 + Math.random() * 80;
        let newX = bird.x + Math.cos(angle) * distance;
        let newY = bird.y + Math.sin(angle) * distance;
        // Constrain birds to street area
        const birdWidth = 40;
        const birdHeight = 24;
        const minX = 0;
        const maxX = this.roadLength - birdWidth;
        const minY = 0;
        const maxY = 400 - birdHeight;
        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));
        bird.direction = (newX < bird.x) ? 'left' : 'right';
        bird.x = newX;
        bird.y = newY;
      });
    }, 1000);
  }

  onChatEButton() {
    if (this.userIdsInChatRange.length > 0) {
      this.handleUserChatRequest(this.userIdsInChatRange[0]);
    }
  }

  async handleUserChatRequest(targetUserId: string) {
    console.log('Chat button clicked', targetUserId);
    const myName = this.player.name || 'User';
    console.log('Attempting to send chat request:', { targetUserId, myName, hubState: this.chatService['hubConnection']?.state });
    try {
      await this.chatService.sendChatRequest(targetUserId, myName);
      this.snackBar.open('Chat request sent!', 'Close', { duration: 2000 });
    } catch (err) {
      console.error('Failed to send chat request:', err);
      this.snackBar.open('Failed to send chat request.', 'Close', { duration: 2000 });
    }
  }

  openChatWithUser(userId: string) {
    if (!this.myUserId) return;
    this.chatService.initiateConversation(this.myUserId, userId).subscribe(conversation => {
      const dialogRef = this.dialog.open(ChatComponent, {
        width: '90vw',
        height: '100vh',
        maxWidth: '1200px',
        maxHeight: '100vh',
        data: { sellerId: userId }
      });
      dialogRef.afterOpened().subscribe(() => {
        this.chatService.waitForConnection().then(() => {
          this.chatService.getMessages(userId).subscribe();
        });
      });
    });
  }
} 