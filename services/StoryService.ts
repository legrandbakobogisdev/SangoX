import { ApiService } from './api';

export interface StoryPayload {
  type: string;
  content: string;
  mediaParams?: any;
  visibility?: 'my_contacts' | 'my_contacts_except' | 'only_share_with';
  excludedViewers?: string[];
  allowedViewers?: string[];
}

class StoryService {
  /**
   * Get all active stories
   */
  async getActiveStories(authorIds?: string[]) {
    let url = '/api/stories/active';
    if (authorIds && authorIds.length > 0) {
      url += `?authorIds=${authorIds.join(',')}`;
    }
    const response = await ApiService.get<any>(url);
    return response?.data || response;
  }

  /**
   * Create a new story
   */
  async createStory(payload: StoryPayload) {
    const response = await ApiService.post<any>('/api/stories', payload);
    return response?.data || response;
  }

  /**
   * Mark a story as viewed by the current user
   */
  async viewStory(storyId: string) {
    const response = await ApiService.post<any>(`/api/stories/${storyId}/view`, {});
    return response?.data || response;
  }

  /**
   * Get viewers of a specific story
   */
  async getStoryViewers(storyId: string) {
    const response = await ApiService.get<any>(`/api/stories/${storyId}/viewers`);
    return response?.data || response;
  }

  /**
   * Delete a story
   */
  async deleteStory(storyId: string) {
    const response = await ApiService.delete<any>(`/api/stories/${storyId}`);
    return response?.data || response;
  }
}

export default new StoryService();
