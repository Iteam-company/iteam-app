import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateNodeDto } from './create-node.dto';

/** `kind` is fixed once a box exists — delete and re-add to change it. */
export class UpdateNodeDto extends PartialType(
  OmitType(CreateNodeDto, ['kind'] as const),
) {}
