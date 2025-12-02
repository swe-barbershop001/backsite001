import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../../common/enums/user.enum';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: UserRole;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/bookings',
})
export class BookingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedAdmins = new Map<number, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Token'ni query yoki auth header'dan olish
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      console.log('gateways =>', token);
      if (!token) {
        client.disconnect();
        return;
      }

      // Token'ni tekshirish
      const payload = this.jwtService.verify(token as string);
      const user = await this.userService.findOne(payload.id);

      if (!user) {
        client.disconnect();
        return;
      }

      // Faqat ADMIN va SUPER_ADMIN ulanishi mumkin
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
        client.disconnect();
        return;
      }

      // Client'ni authenticate qilish
      client.userId = user.id;
      client.userRole = user.role;
      this.connectedAdmins.set(user.id, client.id);

      console.log(
        `[WebSocket] Admin connected: ${user.id} (${user.name || user.phone_number})`,
      );
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedAdmins.delete(client.userId);
      console.log(`[WebSocket] Admin disconnected: ${client.userId}`);
    }
  }

  // Booking yaratilganda barcha admin'larga xabar yuborish
  notifyNewBooking(bookingData: any) {
    this.server.emit('new_booking', bookingData);
    console.log(
      `[WebSocket] New booking notification sent to ${this.connectedAdmins.size} admins`,
    );
  }

  // Booking status o'zgarganda admin'larga xabar yuborish
  notifyBookingStatusChange(bookingId: number, status: string) {
    this.server.emit('booking_status_changed', {
      bookingId,
      status,
    });
  }
}
