import { TOOL_REGISTRY } from '@/shared/config/toolRegistry'

export type CurrentPageType = 'landing' | (typeof TOOL_REGISTRY)[number]['id']
