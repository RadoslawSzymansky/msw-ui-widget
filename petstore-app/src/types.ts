export interface Pet {
  id: number;
  name: string;
  tag?: string;
}

export interface ApiError {
  code: number;
  message: string;
}
