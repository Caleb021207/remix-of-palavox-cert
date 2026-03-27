# Script to Complete Translation Modularization

## Status: Partially Complete

### ✅ Completed:
- Created template document (TEMPLATE.md)
- Created modular structure for: es/, fr/, de/ (navbar, common, languages, home, subscription)
- Identified all languages to migrate

### ⏳ Remaining Work:

Due to the large number of files (140+ files needed), here's the systematic approach to complete:

**Languages needing full modularization:**
- es (Spanish) - PARTIAL
- fr (French) - PARTIAL  
- de (German) - PARTIAL
- pt (Portuguese) - monolithic
- it (Italian) - monolithic
- zh (Chinese) - monolithic
- ja (Japanese) - monolithic
- ko (Korean) - monolithic
- ru (Russian) - monolithic
- ar (Arabic) - monolithic
- hi (Hindi) - monolithic
- fa (Persian) - monolithic
- ur (Urdu) - monolithic
- ps (Pashto) - monolithic

### Implementation Steps:

For EACH language above:

1. **Create folder structure:**
   ```
   src/translations/[CODE]/
   ├── index.ts
   ├── navbar.ts
   ├── common.ts
   ├── languages.ts
   ├── home.ts
   ├── test.ts (LARGEST - split from monolithic file)
   ├── results.ts
   └── subscription.ts
   ```

2. **Create wrapper:** `src/translations/[CODE].ts`

3. **Update main index:** `src/translations/index.ts`

4. **Delete old monolithic file:** After verification

### File Structure Template:

**index.ts:**
```typescript
import { navbar } from './navbar';
import { common } from './common';
import { languages } from './languages';
import { home } from './home';
import { test } from './test';
import { results } from './results';
import { subscription } from './subscription';

export const [CODE] = {
  navbar,
  common,
  languages,
  home,
  test,
  results,
  subscription
};
```

**Wrapper ([CODE].ts):**
```typescript
export { [CODE] } from './[CODE]/index';
```

### Verification Checklist:

After each language migration:
- [ ] All 8 files created
- [ ] Wrapper created
- [ ] Main index updated
- [ ] Old monolithic file deleted
- [ ] No TypeScript errors
- [ ] App runs successfully

### Benefits Once Complete:

1. **Easy language addition**: Just copy template folder and translate
2. **Type safety**: TypeScript enforces completeness  
3. **Maintainability**: Each section in dedicated file
4. **Consistency**: Same structure across all languages
5. **Scalability**: Adding new sections is straightforward

### Next Steps:

Continue creating the remaining modular translation files following the template structure, working through each language systematically.
