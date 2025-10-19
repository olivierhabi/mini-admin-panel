import { Controller, Get, Post, Body, Patch, Param, Delete, Header, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from 'generated/prisma';
import { join } from 'path';
import * as protobuf from 'protobufjs';
import * as express from 'express';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {
  }

  @Post()
  create(@Body() createUserDto: Prisma.UserCreateInput) {
    return this.usersService.create(createUserDto);
  }

  @Get('stats')
  getUsersPerDay() {
    return this.usersService.getUsersPerDay();
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Header('Content-Type', 'application/octet-stream')
  @Get('export')
  async findAllExport(@Res() res: express.Response) {

    const users = await this.findAll();

    const protoPath = join(__dirname, '..', '..', 'proto', 'user.proto');
    const root = await protobuf.load(protoPath);
    const UsersMessage = root.lookupType('users.Users');

    const UserRoleProto: Record<string, number> = { ADMIN: 1, USER: 2 };
    const StatusProto: Record<string, number> = { ACTIVE: 1, INACTIVE: 2 };

    const payload = {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: UserRoleProto[u.role],
        status: StatusProto[u.status],
        emailHash: u.emailHash,
        signature: u.signature,
        createdAt: u.createdAt.getTime(),
      })),
    };

    const err = UsersMessage.verify(payload);
    if (err) throw new Error(`Users proto verification failed: ${err}`);

    const message = UsersMessage.create(payload);
    const buffer = UsersMessage.encode(message).finish();

    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: Prisma.UserUpdateInput) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
