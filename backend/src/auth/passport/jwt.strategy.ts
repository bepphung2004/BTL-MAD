// JwtStrategy: xác thực JWT từ header Authorization: Bearer <token>
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Inject ConfigService; cấu hình strategy: lấy token từ Bearer header, dùng JWT_SECRET
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Sau khi token hợp lệ, map payload thành object gán vào `request.user`
  async validate(payload: IUser) {
    const { _id, name, email, role, company, age, gender, address } = payload;
    return { _id, name, email, role, company, age, gender, address };
  }
}
