export interface UserVoucher {
  id: number;
  code: string;
  discountPercent: number;
  expiryDate: string; // ISO date string
  used: boolean;
  minigameId: string;
  createdAt: string; // ISO date string
}
