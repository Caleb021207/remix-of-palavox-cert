// Database initialization — uses new item_bank schema
import { supabase } from '@/integrations/supabase/client';

export const initializeDatabase = async () => {
  console.log('✅ Database initialized (new schema)');
};

export async function getDatabaseStats() {
  try {
    const { data } = await supabase
      .from('item_bank')
      .select('section_type, cefr_target')
      .eq('active', true);
    
    const stats: Record<string, number> = {};
    data?.forEach(q => {
      const key = `${q.section_type}-${q.cefr_target}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    return { categoryStats: stats, total: data?.length || 0 };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}

export async function needsInitialPopulation(): Promise<boolean> {
  const { count } = await supabase
    .from('item_bank')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);
  return (count || 0) < 100;
}
