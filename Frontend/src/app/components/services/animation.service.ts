import { Injectable } from '@angular/core';

export interface FlyImageAnimationState {
  productId: number;
  imageUrl: string;
  rect: DOMRect;
}

@Injectable({ providedIn: 'root' })
export class AnimationService {
  private flyImageState: FlyImageAnimationState | null = null;

  setFlyImageState(state: FlyImageAnimationState) {
    this.flyImageState = state;
  }

  getFlyImageState(): FlyImageAnimationState | null {
    const state = this.flyImageState;
    this.flyImageState = null; // Clear after reading
    return state;
  }
} 