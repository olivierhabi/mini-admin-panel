import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CryptoModule } from 'src/crypto/crypto.module';

@Module({
  imports: [DatabaseModule, CryptoModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }
