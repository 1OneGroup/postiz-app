import { ProjectContextTool } from '@gitroom/nestjs-libraries/chat/project-agent/tools/project-context.tool';
import { CreateSamplePostTool } from '@gitroom/nestjs-libraries/chat/project-agent/tools/create-sample-post.tool';
import { ListSamplePostsTool } from '@gitroom/nestjs-libraries/chat/project-agent/tools/list-sample-posts.tool';
import { UpdateSamplePostTool } from '@gitroom/nestjs-libraries/chat/project-agent/tools/update-sample-post.tool';
import { GenerateImageTool } from '@gitroom/nestjs-libraries/chat/project-agent/tools/generate-image.tool';

export const projectToolList = [
  ProjectContextTool,
  CreateSamplePostTool,
  ListSamplePostsTool,
  UpdateSamplePostTool,
  GenerateImageTool,
];
