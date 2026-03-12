import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { Organization } from '@prisma/client';
import { PlannerConfigRepository } from '@gitroom/nestjs-libraries/monthly-planner/planner-config.repository';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { GenerateMonthlyPlanDto } from '@gitroom/nestjs-libraries/monthly-planner/dto/monthly-planner.dto';

@Injectable()
export class MonthlyPlannerService {
  constructor(
    private _plannerConfigRepository: PlannerConfigRepository,
    private _brandContextService: BrandContextService,
    private _postsRepository: PostsRepository,
  ) {}

  async generate(orgId: string, org: Organization, dto: GenerateMonthlyPlanDto) {
    // 1. Load PlannerConfig for projectTag (use stored postsPerWeek if not in dto)
    const config = await this._plannerConfigRepository.findByProjectTag(orgId, dto.projectTag);
    const postsPerWeek = dto.postsPerWeek || config?.postsPerWeek || 3;

    // 2. Fetch enriched BrandContext blocks (with Google Drive content if linked)
    const enrichedContexts = await this._brandContextService.getEnrichedContextsForProject(orgId, dto.projectTag);

    // 3. Get location from brand context
    const locationContext = enrichedContexts.find(c => c.location);
    const location = locationContext?.location || 'India';

    // 4. Calculate total posts
    const [year, monthNum] = dto.month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    const totalPosts = postsPerWeek * weeksInMonth;

    // 5. Build the brand context string
    const brandContextString = enrichedContexts
      .map(c => `[${c.type.toUpperCase()}: ${c.name}]\n${c.content}`)
      .join('\n\n---\n\n');

    const categories = (config?.preferredCategories as string[] | null) ||
      ['Promotional', 'Educational', 'Behind The Scenes', 'Testimonial', 'Lifestyle', 'Update'];
    const guidelines = config?.contentGuidelines || '';

    // 6. Define response schema with Zod
    const PostSchema = z.object({
      posts: z.array(z.object({
        title: z.string(),
        content: z.string().describe('HTML formatted post content using <p>, <strong>, <h2>, <h3>, <ul>, <li> tags. Must be standalone with no image references.'),
        suggestedDate: z.string().describe('ISO date string YYYY-MM-DD within the target month'),
        category: z.string(),
        topic: z.string(),
        contextualHook: z.string().describe('Why this post is relevant to this date - e.g. "Holi weekend", "FY closing urgency"'),
      }))
    });

    // 7. Call Gemini
    const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `You are a real estate social media content strategist for the Indian market. Generate a monthly content calendar of ${totalPosts} posts for ${monthName}.

BRAND CONTEXT:
${brandContextString}

LOCATION: ${location}

CONTENT GUIDELINES:
${guidelines || 'Professional, engaging, mix of informational and promotional content.'}

PREFERRED CATEGORIES (use a mix): ${JSON.stringify(categories)}

RULES:
1. Consider Indian national festivals/holidays in ${monthName}: Republic Day (Jan 26), Holi (March), Independence Day (Aug 15), Dussehra, Diwali, Christmas, New Year, Eid, Navratri, Ganesh Chaturthi, Lohri (Jan), Baisakhi (April), etc.
2. Consider financial calendar: GST deadlines, financial year closing (March), new FY (April), tax saving season (Jan-March), budget announcements.
3. Consider regional events relevant to ${location}.
4. Consider seasonal themes: Monsoon (July-Sept), winter (Nov-Jan), summer (April-June) with real estate angles.
5. Consider real estate seasonality: festive season buying (Oct-Nov), year-end offers (Dec), new launch season (Jan-March).
6. Space posts intelligently across the month - mix weekdays and weekends. No two consecutive posts should have the same category.
7. Content must be HTML formatted: <p>, <strong>, <h2>, <h3>, <ul>, <li> tags.
8. Each post must be standalone text - NO image references since images are added separately later.
9. Reference actual project details from the brand context (pricing, amenities, USPs, RERA numbers, location benefits).
10. Each post needs a contextualHook explaining why it's relevant to that specific date.

Generate ${totalPosts} social media posts for ${monthName} for the project tagged "${dto.projectTag}". Space them across the month intelligently.`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(PostSchema) as any,
      },
    });

    let posts: Array<{ title: string; content: string; suggestedDate: string; category: string; topic: string; contextualHook: string }> = [];
    try {
      const parsed = JSON.parse(result.text || '{}');
      posts = parsed.posts || [];
    } catch {
      posts = [];
    }

    // 8. Create draft posts via PostsRepository
    const createdPostIds: string[] = [];
    const integrationIds = dto.integrationIds || [];

    for (const post of posts) {
      for (const integrationId of integrationIds) {
        try {
          const { posts: createdPosts } = await this._postsRepository.createOrUpdatePost(
            'draft',
            orgId,
            post.suggestedDate,
            {
              integration: { id: integrationId },
              value: [{ content: post.content, image: [], id: '', delay: 0 }],
              settings: {} as any,
            } as any,
            [],
            0,
          );
          if (createdPosts?.length) {
            createdPostIds.push(createdPosts[0].id);
          }
        } catch (err) {
          console.error('Failed to create post:', post.title, err);
        }
      }
    }

    return {
      projectTag: dto.projectTag,
      month: dto.month,
      totalGenerated: posts.length,
      count: createdPostIds.length,
      postsPerWeek,
      postIds: createdPostIds,
      posts: posts.map(p => ({
        ...p,
        status: 'draft',
      })),
    };
  }
}
