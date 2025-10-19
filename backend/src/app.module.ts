import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { CryptoService } from './crypto/crypto.service';
import { CryptoModule } from './crypto/crypto.module';

@Module({
  imports: [DatabaseModule, UsersModule, CryptoModule],
  controllers: [AppController],
  providers: [AppService, CryptoService],
})
export class AppModule { }
