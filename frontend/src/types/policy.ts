export interface Policy {
  id: number;
  policyName: string;
  userId: number;
  status: string;
  outstanding: number;
  policyTerm: number;
  paymentDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyError {
  message: string;
  statusCode?: number;
}