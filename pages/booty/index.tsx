// Exported directly rather than wrapped, so `/booty` and `/booty/[card]` are the same component
// type and switching between them re-renders Booty instead of remounting it. See `BootyPage`.
export { default } from '@/codex/BootyPage'
