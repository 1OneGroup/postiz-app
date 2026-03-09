import { Global, Module } from '@nestjs/common';
import { ImagesSlides } from '@gitroom/nestjs-libraries/videos/images-slides/images.slides';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { Veo3 } from '@gitroom/nestjs-libraries/videos/veo3/veo3';
import { NanoBananaBrand } from '@gitroom/nestjs-libraries/videos/nano-banana-brand/nano-banana-brand';
import { BrandContextModule } from '@gitroom/nestjs-libraries/brand-context/brand-context.module';
import { ImageTemplatesModule } from '@gitroom/nestjs-libraries/image-templates/image-templates.module';

@Global()
@Module({
  imports: [BrandContextModule, ImageTemplatesModule],
  providers: [ImagesSlides, Veo3, NanoBananaBrand, VideoManager],
  get exports() {
    return this.providers;
  },
})
export class VideoModule {}
