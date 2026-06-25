import { SetMetadata } from '@nestjs/common';

export const BACKOFFICE_METADATA_KEY = 'backoffice';
export const BackofficeToken = () => SetMetadata(BACKOFFICE_METADATA_KEY, true);
