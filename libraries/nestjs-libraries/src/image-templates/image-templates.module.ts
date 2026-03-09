import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { ImageTemplatesController } from '@gitroom/nestjs-libraries/image-templates/image-templates.controller';
import { ImageTemplatesService } from '@gitroom/nestjs-libraries/image-templates/image-templates.service';
import { ImageTemplatesRepository } from '@gitroom/nestjs-libraries/image-templates/image-templates.repository';

@Module({
  controllers: [ImageTemplatesController],
  providers: [ImageTemplatesService, ImageTemplatesRepository],
  exports: [ImageTemplatesService],
})
export class ImageTemplatesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ImageTemplatesController);
  }
}
