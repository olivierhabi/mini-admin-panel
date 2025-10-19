import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { createHash } from 'crypto';


@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly crypto: CryptoService,
  ) { }

  async create(createUserDto: Prisma.UserCreateInput) {
    const emailHash = createHash('sha384').update(createUserDto.email).digest('hex');
    const signature = this.crypto.sign(emailHash);

    try {
      return await this.databaseService.user.create({
        data: {
          email: createUserDto.email,
          role: createUserDto.role,
          status: createUserDto.status,
          emailHash,
          signature,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User exists');
      }
      throw error;
    }
  }



  async getUsersPerDay(): Promise<{ date: string; users: number }[]> {
    const rows = await this.databaseService.$queryRaw<
      Array<{ date: string; users: number | bigint }>
    >`
      SELECT 
        DATE("createdAt" / 1000, 'unixepoch') as date, 
        COUNT(id) as users 
      FROM "User" 
      WHERE "createdAt" >= STRFTIME('%s', 'now', '-7 days') * 1000
      GROUP BY date`;

    return rows.map(r => ({ date: r.date, users: Number(r.users) }));
  }

  async findAll() {
    return this.databaseService.user.findMany()
  }

  async findOne(id: number) {
    const user = await this.databaseService.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateUserDto: Prisma.UserUpdateInput) {
    try {
      return await this.databaseService.user.update({
        where: { id },
        data: updateUserDto
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      if (error.message?.includes('Invalid value for argument')) {
        throw new BadRequestException('Invalid data provided');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.databaseService.user.delete({
        where: { id }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }
}
