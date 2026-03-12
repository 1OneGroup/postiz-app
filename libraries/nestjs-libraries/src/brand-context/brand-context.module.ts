import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { BrandContextController } from '@gitroom/nestjs-libraries/brand-context/brand-context.controller';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';
import { BrandContextRepository } from '@gitroom/nestjs-libraries/brand-context/brand-context.repository';
import { GoogleDriveModule } from '@gitroom/nestjs-libraries/google-drive/google-drive.module';

@Module({
  imports: [GoogleDriveModule],
  controllers: [BrandContextController],
  providers: [BrandContextService, BrandContextRepository],
  exports: [BrandContextService],
})
export class BrandContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(BrandContextController);
  }
}
