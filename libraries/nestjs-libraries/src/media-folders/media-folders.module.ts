import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { MediaFoldersController } from '@gitroom/nestjs-libraries/media-folders/media-folders.controller';
import { MediaFoldersService } from '@gitroom/nestjs-libraries/media-folders/media-folders.service';
import { MediaFoldersRepository } from '@gitroom/nestjs-libraries/media-folders/media-folders.repository';

@Module({
  controllers: [MediaFoldersController],
  providers: [MediaFoldersService, MediaFoldersRepository],
  exports: [MediaFoldersService],
})
export class MediaFoldersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(MediaFoldersController);
  }
}
