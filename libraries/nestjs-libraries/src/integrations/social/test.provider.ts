import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';

export class TestProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 10;
  identifier = 'test';
  name = 'Test Channel';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;

  maxLength() {
    return 10000;
  }

  async customFields() {
    return [
      {
        key: 'name',
        label: 'Channel Name',
        defaultValue: 'My Test Channel',
        validation: `/^.{1,50}$/`,
        type: 'text' as const,
      },
    ];
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 999999999,
      accessToken: 'test-token',
      id: 'test-user',
      name: 'Test Channel',
      picture: '',
      username: 'test',
    };
  }

  async generateAuthUrl() {
    const state = makeId(17);
    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }): Promise<AuthTokenDetails> {
    const decoded = JSON.parse(
      Buffer.from(params.code, 'base64').toString('utf-8')
    );
    const channelName = decoded.name || 'Test Channel';

    return {
      id: `test-${makeId(8)}`,
      name: channelName,
      accessToken: `test-token-${makeId(16)}`,
      refreshToken: `test-refresh-${makeId(16)}`,
      expiresIn: 999999999,
      picture: '',
      username: channelName.toLowerCase().replace(/\s+/g, '_'),
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return postDetails.map((post) => {
      const postId = `test-post-${makeId(12)}`;
      console.log(
        `[TestProvider] Published post: "${post.message?.substring(0, 100)}..."`,
        post.media?.length ? `with ${post.media.length} media files` : ''
      );
      return {
        id: post.id,
        postId,
        releaseURL: `https://test.example.com/posts/${postId}`,
        status: 'completed',
      };
    });
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return postDetails.map((post) => {
      const commentId = `test-comment-${makeId(12)}`;
      return {
        id: post.id,
        postId: commentId,
        releaseURL: `https://test.example.com/posts/${postId}/comments/${commentId}`,
        status: 'completed',
      };
    });
  }
}
