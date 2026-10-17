import { AttachedPhoto } from '../types/quotation';

export const DEMO_ILLUSTRATION_LABEL = 'Demo illustration — not an actual destination or accommodation photo.';
export const DEMO_PHOTO_UNVERIFIED_LABEL = DEMO_ILLUSTRATION_LABEL;
export const UNVERIFIED_PHOTO_LABEL = 'Photo — destination/accommodation unverified.';
export const CONFIRMED_PHOTO_LABEL = 'Confirmed photo — verified by Petra';

export function isUploadedPhoto(photo: AttachedPhoto): boolean {
  if (!photo) return false;
  if (photo.isUploadedPhoto || photo.isTemporaryUpload) return true;
  if (photo.url && photo.url.startsWith('data:')) return true;
  if (photo.id && photo.id.startsWith('upload-')) return true;
  if (photo.url && !photo.url.includes('/pictures/placeholder/')) return true;
  return false;
}

export function getPhotoBadgeInfo(photo: AttachedPhoto): {
  label: string;
  type: 'verified' | 'unverified_upload' | 'demo_illustration';
} {
  if (photo.verificationStatus === 'Confirmed by Petra') {
    return {
      label: CONFIRMED_PHOTO_LABEL,
      type: 'verified',
    };
  }

  if (isUploadedPhoto(photo)) {
    return {
      label: UNVERIFIED_PHOTO_LABEL,
      type: 'unverified_upload',
    };
  }

  return {
    label: DEMO_ILLUSTRATION_LABEL,
    type: 'demo_illustration',
  };
}

export const SAMPLE_DESTINATION_PHOTOS: AttachedPhoto[] = [
  {
    id: 'photo-islands-overview',
    title: 'San Blas Tropical Island Overview',
    caption: 'Reference illustration of tropical Caribbean island with palm trees and ocean waters.',
    island: 'Isla Chichime',
    cabinCategory: 'General Island View',
    verificationStatus: 'Unverified demo',
    url: '/pictures/placeholder/islands.jpg',
    isUploadedPhoto: false,
  },
  {
    id: 'photo-beachfront-cabana',
    title: 'Beachside Island Shelter',
    caption: 'Reference illustration of wooden island shelter near palm trees and ocean shore.',
    island: 'Isla Chichime',
    cabinCategory: 'Beachfront Cabaña',
    verificationStatus: 'Unverified demo',
    url: '/pictures/04 Franklin.jpg',
    isUploadedPhoto: false,
  },
  {
    id: 'photo-panama-city',
    title: 'Panama City Skyline at Sunset',
    caption: 'Overnight starting point in Panama City for transfers to Guna Yala.',
    island: 'Panama City',
    cabinCategory: 'Starting Point',
    verificationStatus: 'Confirmed by Petra',
    url: '/pictures/Panama City Skyline at Sunset.png',
    isUploadedPhoto: true,
  },
  {
    id: 'photo-carti-port',
    title: 'Carti Port (Puerto Carti)',
    caption: 'Official maritime portal and boat departure hub into Guna Yala.',
    island: 'Carti Port',
    cabinCategory: 'Boat Hub',
    verificationStatus: 'Confirmed by Petra',
    url: '/pictures/carti port Island.jpg',
    isUploadedPhoto: true,
  },
  {
    id: 'photo-franklin-island',
    title: 'Isla Franklin (Franklin Island)',
    caption: 'Traditional beachfront cabanas on Isla Franklin surrounded by calm turquoise waters.',
    island: 'Isla Franklin',
    cabinCategory: 'Beachfront Cabaña',
    verificationStatus: 'Confirmed by Petra',
    url: '/pictures/Franklin.jpg',
    isUploadedPhoto: true,
  },
  {
    id: 'photo-perro-chico',
    title: 'Perro Chico (Dog Island)',
    caption: 'Famous island featuring iconic sunken shipwreck and vibrant reef snorkeling.',
    island: 'Isla Perro Chico',
    cabinCategory: 'Island Cay',
    verificationStatus: 'Confirmed by Petra',
    url: '/pictures/perrochico.jpg',
    isUploadedPhoto: true,
  },
  {
    id: 'photo-cay-lagoon',
    title: 'Caribbean Island Lagoon',
    caption: 'Reference illustration of clear shallow tropical sea and small island shoreline.',
    island: 'Isla Chichime Chico',
    cabinCategory: 'Island Cay',
    verificationStatus: 'Unverified demo',
    url: '/pictures/10 Boat Day Tour.jpg',
    isUploadedPhoto: false,
  },
  {
    id: 'photo-reef-snorkeling',
    title: 'Tropical Waters & Marine Environment',
    caption: 'Reference illustration of clear Caribbean waters suitable for swimming and snorkeling.',
    island: 'Cayos Limón',
    cabinCategory: 'Reef & Waters',
    verificationStatus: 'Unverified demo',
    url: '/pictures/placeholder/snorkeling.jpg',
    isUploadedPhoto: false,
  },
  {
    id: 'photo-sailing-vessel',
    title: 'Caribbean Sailing Experience',
    caption: 'Reference illustration of sailing vessel anchored off tropical island waters.',
    island: 'Sailing / Catamaran',
    cabinCategory: 'Catamaran',
    verificationStatus: 'Unverified demo',
    url: '/pictures/catamaran.jpg',
    isUploadedPhoto: false,
  },
  {
    id: 'photo-guna-hospitality',
    title: 'Guna Yala Island Environment',
    caption: 'Reference illustration of traditional tropical island setting in Guna Yala territory.',
    island: 'Guna Yala Territory',
    cabinCategory: 'Cultural Environment',
    verificationStatus: 'Unverified demo',
    url: '/pictures/placeholder/culture.jpg',
    isUploadedPhoto: false,
  },
  {
    id: 'photo-transport-4x4',
    title: '4x4 & Boat Logistics Journey',
    caption: 'Reference illustration of 4x4 vehicle and boat transfer journey to island destinations.',
    island: 'Logistics',
    cabinCategory: 'Transfers',
    verificationStatus: 'Unverified demo',
    url: '/pictures/01 Boat Day Tour .jpg',
    isUploadedPhoto: false,
  },
];
