'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';

export default withProvider({
  postComment: PostComment.ALL,
  minimumCharacters: [],
  SettingsComponent: undefined,
  CustomPreviewComponent: undefined,
  dto: undefined,
  checkValidity: undefined,
  maximumCharacters: 10000,
});
