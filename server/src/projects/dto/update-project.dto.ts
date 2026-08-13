import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/**
 * Membership is edited through the /members endpoints, never through PATCH —
 * so the two id arrays are omitted here.
 */
export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['holderIds', 'helperIds'] as const),
) {}
