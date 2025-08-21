export interface Claim {
  id: number;
  status: string;
  damage: string;
  updatedAt: Date;
  createdAt: Date;
  userId: number;
  vehicle?: string;
  photos?: string[];
}

export interface ClaimStatusResponse {
  claimId: number;
  status: string;
  updatedAt: Date;
}

export interface ClaimStatusRequest {
  claim_id: number;
}

export interface CreateClaimRequest {
  description: string;
  vehicleInfo?: string;
  photos?: string[];
}