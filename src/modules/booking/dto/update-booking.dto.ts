import { BookingStatus } from '../../../common/constants';

export class UpdateBookingDto {
  status?: BookingStatus;
  date?: string;
  time?: string;
}

