import api from './axios';

export const getStories = () => api.get('/stories');
export const createStory = (data) => api.post('/stories', data);
export const markStoryViewed = (id) => api.patch(`/stories/${id}/view`);
