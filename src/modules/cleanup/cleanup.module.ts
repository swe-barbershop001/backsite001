import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { Booking } from "../booking/entities/booking.entity";
import { CleanupService } from "./cleanup.service";

@Module({
    imports: [TypeOrmModule.forFeature([User, Booking])],
    providers: [CleanupService],
})
export class CleanupModule{}