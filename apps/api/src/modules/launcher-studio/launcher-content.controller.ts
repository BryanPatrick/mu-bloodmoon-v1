import { Controller, Get, Query } from '@nestjs/common'
import { LauncherStudioService } from './launcher-studio.service'

// Part AJ/AL -- the real Launcher client's read path for slot-registry
// content. Public (same trust level as GET /launcher/bootstrap, which this
// is additive to, not a replacement for) -- returns only resolved,
// PUBLISHED slot values via ResolvedSlot, never a raw LauncherSlotContent
// row and never a draft value. Deliberately a separate controller/route
// (`/launcher/content`) rather than a change to LauncherController itself,
// so this phase never has to modify the already-working bootstrap path.
@Controller('launcher')
export class LauncherContentController {
  constructor(private readonly launcherStudio: LauncherStudioService) {}

  @Get('content')
  content(@Query('page') page?: string) {
    return this.launcherStudio.resolvedContent(page)
  }
}
