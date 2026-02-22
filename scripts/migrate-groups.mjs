// scripts/migrate-groups.mjs
// Creates a default "Football Group – ALB" (advanced) group and assigns all existing
// ungrouped players and matches to it. Safe to re-run: skips already-migrated rows.
//
// Usage: node --env-file=.env scripts/migrate-groups.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

console.log('🔄 Migrating existing data to default group...\n');

// 1. Create the default group (or fetch existing by name)
const GROUP_NAME = 'Football Group – ALB';
let groupId;

const { data: existing } = await supabase
  .from('groups')
  .select('id')
  .eq('name', GROUP_NAME)
  .maybeSingle();

if (existing) {
  groupId = existing.id;
  console.log(`✅ Group already exists: ${groupId}`);
} else {
  const { data: created, error } = await supabase
    .from('groups')
    .insert({ name: GROUP_NAME, mode: 'advanced' })
    .select('id')
    .single();
  if (error) { console.error('❌ Failed to create group:', error.message); process.exit(1); }
  groupId = created.id;
  console.log(`✅ Created group: ${groupId}`);
}

// 2. Assign ungrouped players to the group
const { error: playerErr, count: playerCount } = await supabase
  .from('players')
  .update({ group_id: groupId })
  .is('group_id', null);

if (playerErr) { console.error('❌ Players migration error:', playerErr.message); process.exit(1); }
console.log(`✅ Migrated players (updated ${playerCount ?? 'unknown'} rows)`);

// 3. Assign ungrouped matches to the group
const { error: matchErr, count: matchCount } = await supabase
  .from('matches')
  .update({ group_id: groupId })
  .is('group_id', null);

if (matchErr) { console.error('❌ Matches migration error:', matchErr.message); process.exit(1); }
console.log(`✅ Migrated matches (updated ${matchCount ?? 'unknown'} rows)`);

console.log('\n🎉 Migration complete!');
console.log(`\nGroup ID (save this): ${groupId}`);
console.log(`URL: /groups/${groupId}/matches`);
