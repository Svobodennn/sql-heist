// Client engine lifecycle status — shared by useEngine (jobs) and useCaseEngine so
// EngineLoader renders the exact same states from either hook. Lives in a neutral
// lib module so neither hook owns the other's type.
export type EngineStatus = 'loading' | 'ready' | 'error'
