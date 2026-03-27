# Translation Template for New Languages

## How to Add a New Language

1. **Create language folder**: `src/translations/[language-code]/`
2. **Copy structure from English** (`src/translations/en.ts`) and split into 7 files:
   - `index.ts` - Main export
   - `navbar.ts` - Navigation items
   - `common.ts` - Common UI elements
   - `languages.ts` - Language names
   - `home.ts` - Home page content
   - `test.ts` - Test-taking UI
   - `results.ts` - Results page
   - `subscription.ts` - Subscription/payment

3. **Create wrapper export**: `src/translations/[language-code].ts`
4. **Register in main index**: Add to `src/translations/index.ts`

## Template Structure

Each language folder must have this EXACT structure:

```
src/translations/[code]/
├── index.ts          # Exports all sections
├── navbar.ts         # navbar object
├── common.ts         # common object
├── languages.ts      # languages object
├── home.ts           # home object
├── test.ts           # test object (largest file)
├── results.ts        # results object
└── subscription.ts   # subscription object
```

## Example: Adding Korean (ko)

### 1. Create folder and files
```bash
mkdir src/translations/ko
```

### 2. Create each file by translating from English

File: `src/translations/ko/navbar.ts`
```typescript
export const navbar = {
  takeTest: "[Korean translation]",
  signIn: "[Korean translation]",
  // ... etc
};
```

### 3. Create index.ts
```typescript
import { navbar } from './navbar';
import { common } from './common';
import { languages } from './languages';
import { home } from './home';
import { test } from './test';
import { results } from './results';
import { subscription } from './subscription';

export const ko = {
  navbar,
  common,
  languages,
  home,
  test,
  results,
  subscription
};
```

### 4. Create wrapper export
File: `src/translations/ko.ts`
```typescript
export { ko } from './ko/index';
```

### 5. Register in main translations
File: `src/translations/index.ts`
```typescript
import { ko } from './ko';
// ... other imports

export const translations = {
  // ... other languages
  ko,
};
```

## TypeScript Type Safety

All translations must match the English structure exactly. TypeScript will enforce this through the `TranslationKeys` type defined in `index.ts`.

## Validation

Run this to check all languages have complete translations:
```bash
# TODO: Add validation script
npm run validate-translations
```
