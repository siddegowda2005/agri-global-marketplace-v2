import { Notification } from '../models/Notification.js';
export const notify = (user, type, message, link) => Notification.create({ user, type, message, link }).catch(() => null);
