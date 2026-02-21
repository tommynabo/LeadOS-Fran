# Signature Mismatch Fix - userId Parameter Chain

## Problem Identified

When the new SearchService was integrated, a critical **parameter mismatch** occurred between `BufferedSearchService` and `SearchService`:

### Before (Broken)
```typescript
// In BufferedSearchService.ts (line 260)
searchService.startSearch(config, onLog, (leads) => {
    // ...
});

// searchService.startSearch() expects:
public async startSearch(
    config: SearchConfigState,
    userId: string | null,  // ← MISSING in the call!
    onLog: LogCallback,     // ← Received onLog instead
    onComplete: ResultCallback  // ← Received callback instead
)
```

This caused parameter misalignment:
- `config` → matched ✅
- `onLog` → received as `userId` (wrong type!) ❌
- `(leads) => {...}` → received as `onLog` when it's a callback ❌
- `undefined` → sent to `onComplete` parameter position ❌

## Errors Caused

1. **TypeError: c is not a function** 
   - The `onComplete` callback received `undefined` instead of the callback function

2. **Supabase 400 Error - Malformed Query**
   - When `userId` was undefined, the Supabase query became: `user_id=eq.X%3D%3EV%28X%29`
   - This happened in `SearchService.fetchHistory(userId)` when userId was undefined

3. **Cannot read properties of undefined (reading 'bottleneck')**
   - Because analysis didn't complete, the `bottleneck` property wasn't set on leads

## Solution Implemented

Modified the function call chain to properly pass `userId`:

### Changes Made

**1. Extract userId in startBufferedSearch** (lines 103-105)
```typescript
// Obtener userId de Supabase
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id || null;
```

**2. Pass userId to executeMultiSourceStrategy** (line 108)
```typescript
await this.executeMultiSourceStrategy(config, userId, onLog);
```

**3. Update executeMultiSourceStrategy signature** (line 189)
```typescript
private async executeMultiSourceStrategy(
    config: SearchConfigState,
    userId: string | null,  // ← Added
    onLog: LogCallback
)
```

**4. Pass userId to executeStrategyWithRetry** (line 210)
```typescript
await this.executeStrategyWithRetry(tempConfig, userId, onLog, maxIterations);
```

**5. Update executeStrategyWithRetry signature** (line 231)
```typescript
private async executeStrategyWithRetry(
    config: SearchConfigState,
    userId: string | null,  // ← Added
    onLog: LogCallback,
    maxIterations: number
)
```

**6. Fix the startSearch call** (line 266)
```typescript
searchService.startSearch(config, userId, onLog, (leads) => {
    //                           ^^^^^^
    //                           ← NOW INCLUDED!
```

## Verification

✅ TypeScript Compilation: No errors
✅ Git Commit: Successful
✅ Buffer Chain: Now properly typed

## Expected Behavior After Fix

When user runs a search:
1. `userId` is extracted from Supabase auth ✅
2. `userId` is properly passed through all method calls ✅
3. `SearchService.startSearch()` receives the correct 4 parameters in correct order ✅
4. Deduplication history loads correctly via `fetchHistory(userId)` ✅
5. Analysis completes with `bottleneck` property set ✅
6. `LeadsTable` can access `lead.aiAnalysis.bottleneck` without crashing ✅

## Resources
- **Git Commit**: 045c264
- **Files Modified**: `BufferedSearchService.ts` only
- **Lines Changed**: 4 methods, 9 lines total modified
