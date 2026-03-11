import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ProjectService } from '@gitroom/nestjs-libraries/projects/project.service';
import { ProjectPostService } from '@gitroom/nestjs-libraries/projects/project-post.service';
import { CreateProjectDto } from '@gitroom/nestjs-libraries/projects/dto/create-project.dto';
import { UpdateProjectDto } from '@gitroom/nestjs-libraries/projects/dto/update-project.dto';
import { CreateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/create-project-post.dto';
import { UpdateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/update-project-post.dto';
import { ScheduleProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/schedule-project-post.dto';
import { ProjectMastraService } from '@gitroom/nestjs-libraries/chat/project-agent/project-mastra.service';
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { RuntimeContext } from '@mastra/core/di';
import { Request, Response } from 'express';

export type ProjectAgentContext = {
  projectId: string;
  projectName: string;
  projectDescription: string;
  organization: string;
  ui: string;
};

@ApiTags('Projects')
@Controller('/projects')
export class ProjectController {
  private readonly _logger = new Logger(ProjectController.name);

  constructor(
    private _projectService: ProjectService,
    private _projectPostService: ProjectPostService,
    private _projectMastraService: ProjectMastraService
  ) {}

  // --- Project CRUD ---

  @Post('/')
  async createProject(
    @GetOrgFromRequest() org: Organization,
    @Body() dto: CreateProjectDto
  ) {
    return this._projectService.create(org.id, dto);
  }

  @Get('/')
  findAllProjects(@GetOrgFromRequest() org: Organization) {
    return this._projectService.findAll(org.id);
  }

  @Get('/:id')
  findOneProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._projectService.findById(org.id, id);
  }

  @Put('/:id')
  updateProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto
  ) {
    return this._projectService.update(org.id, id, dto);
  }

  @Delete('/:id')
  deleteProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._projectService.delete(org.id, id);
  }

  // --- Project Posts CRUD ---

  @Post('/:id/posts')
  createProjectPost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') projectId: string,
    @Body() dto: CreateProjectPostDto
  ) {
    return this._projectPostService.create(org.id, projectId, dto);
  }

  @Get('/:id/posts')
  findProjectPosts(
    @GetOrgFromRequest() org: Organization,
    @Param('id') projectId: string
  ) {
    return this._projectPostService.findAllByProject(org.id, projectId);
  }

  @Put('/:id/posts/:postId')
  updateProjectPost(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Body() dto: UpdateProjectPostDto
  ) {
    return this._projectPostService.update(org.id, postId, dto);
  }

  @Put('/:id/posts/:postId/approve')
  approveProjectPost(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string
  ) {
    return this._projectPostService.approve(org.id, postId);
  }

  @Post('/:id/posts/:postId/schedule')
  scheduleProjectPost(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Body() dto: ScheduleProjectPostDto
  ) {
    return this._projectPostService.scheduleToCalendar(org.id, postId, dto);
  }

  @Delete('/:id/posts/:postId')
  deleteProjectPost(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string
  ) {
    return this._projectPostService.delete(org.id, postId);
  }

  // --- Project Agent Chat ---

  @Post('/:id/agent')
  async projectAgent(
    @Req() req: Request,
    @Res() res: Response,
    @GetOrgFromRequest() org: Organization,
    @Param('id') projectId: string
  ) {
    if (!process.env.GEMINI_API_KEY) {
      this._logger.warn('Gemini API key not set');
      return;
    }

    const project = await this._projectService.findById(org.id, projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const mastra = await this._projectMastraService.mastra();
    const runtimeContext = new RuntimeContext<ProjectAgentContext>();
    runtimeContext.set('projectId', project.id);
    runtimeContext.set('projectName', project.name);
    runtimeContext.set('projectDescription', project.description || '');
    runtimeContext.set('organization', JSON.stringify(org));
    runtimeContext.set('ui', 'true');

    const agents = MastraAgent.getLocalAgents({
      resourceId: project.id,
      mastra,
      // @ts-ignore
      runtimeContext,
    });

    const runtime = new CopilotRuntime({ agents });

    const copilotRuntimeHandler = copilotRuntimeNextJSAppRouterEndpoint({
      endpoint: `/projects/${projectId}/agent`,
      runtime,
      serviceAdapter: new GoogleGenerativeAIAdapter({
        model: 'gemini-2.5-flash',
      }),
    });

    return copilotRuntimeHandler.handleRequest(req, res);
  }

  @Get('/:id/agent/threads')
  async getProjectThreads(
    @GetOrgFromRequest() org: Organization,
    @Param('id') projectId: string
  ) {
    const mastra = await this._projectMastraService.mastra();
    const memory = await mastra.getAgent('projectAgent').getMemory();
    const list = await memory.getThreadsByResourceIdPaginated({
      resourceId: projectId,
      perPage: 100000,
      page: 0,
      orderBy: 'createdAt',
      sortDirection: 'DESC',
    });

    return {
      threads: list.threads.map((p: any) => ({
        id: p.id,
        title: p.title,
      })),
    };
  }

  @Get('/:id/agent/threads/:threadId/list')
  async getProjectThreadMessages(
    @GetOrgFromRequest() org: Organization,
    @Param('id') projectId: string,
    @Param('threadId') threadId: string
  ) {
    const mastra = await this._projectMastraService.mastra();
    const memory = await mastra.getAgent('projectAgent').getMemory();
    try {
      return await memory.query({
        resourceId: projectId,
        threadId,
      });
    } catch (err) {
      return { messages: [] };
    }
  }
}
