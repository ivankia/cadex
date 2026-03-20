export interface BookingRequest {
  user_id: string;
  seat_id: string
}

export type BookingResponse = {
  success: boolean;
  message: string;
}

export type ErrorResponse = BookingResponse & {
  error: string;
}