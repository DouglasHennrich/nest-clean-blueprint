import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { z } from "zod";
import { TEnvService } from "@/modules/env/services/env.service";

const tokenPayloadSchema = z.object({
  sub: z.string().uuid(),
});

export type TAccountPayload = z.infer<typeof tokenPayloadSchema>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envService: TEnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(envService.get("AUTH_JWT_PUBLIC_KEY"), "base64"),
      algorithms: ["RS256"],
      ignoreExpiration: false,
    });
  }

  validate(payload: unknown): TAccountPayload {
    return tokenPayloadSchema.parse(payload);
  }
}
