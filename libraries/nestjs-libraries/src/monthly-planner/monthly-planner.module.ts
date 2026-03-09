import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { BrandContextModule } from '@gitroom/nestjs-libraries/brand-context/brand-context.module';
import { MonthlyPlannerController } from '@gitroom/nestjs-libraries/monthly-planner/monthly-planner.controller';
import { MonthlyPlannerService } from '@gitroom/nestjs-libraries/monthly-planner/monthly-planner.service';
import { PlannerConfigService } from '@gitroom/nestjs-libraries/monthly-planner/planner-config.service';
import { PlannerConfigRepository } from '@gitroom/nestjs-libraries/monthly-planner/planner-config.repository';

@Module({
  imports: [BrandContextModule],
  controllers: [MonthlyPlannerController],
  providers: [MonthlyPlannerService, PlannerConfigService, PlannerConfigRepository],
  exports: [MonthlyPlannerService, PlannerConfigService],
})
export class MonthlyPlannerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(MonthlyPlannerController);
  }
}
