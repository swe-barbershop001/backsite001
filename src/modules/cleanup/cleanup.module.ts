import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { CleanupService } from "./cleanup.service";

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [CleanupService],
})
export class CleanupModule{}