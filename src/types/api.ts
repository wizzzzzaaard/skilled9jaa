export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number;
  reference: string;
  onSuccess?: (reference: string) => void;
  onClose?: () => void;
}
