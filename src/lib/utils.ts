import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const mockProfiles = [
  {
    id: '1',
    name: 'Emma',
    age: 25,
    location: 'New York, NY',
    occupation: 'Graphic Designer',
    education: 'NYU',
    images: ['https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400'],
    bio: 'Love exploring new coffee shops and weekend hiking adventures.',
    interests: ['Coffee', 'Hiking', 'Design', 'Photography']
  },
  {
    id: '2',
    name: 'Alex',
    age: 28,
    location: 'San Francisco, CA',
    occupation: 'Software Engineer',
    education: 'Stanford',
    images: ['https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=400'],
    bio: 'Tech enthusiast by day, chef by night.',
    interests: ['Cooking', 'Technology', 'Music', 'Travel']
  }
];
