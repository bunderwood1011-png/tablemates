import { supabase } from '../supabaseClient';

export async function logError({ userId = null, action, error, context = {} }) {
  try {
    const errorMessage =
      typeof error === 'string'
        ? error
        : error?.message || 'Unknown error';

    console.log('LOGGING ERROR TO SUPABASE', {
      userId,
      action,
      errorMessage,
      context,
    });

    const { error: insertError } = await supabase
      .from('app_error_logs')
      .insert([
        {
          user_id: userId,
          action,
          error_message: errorMessage,
          context,
        },
      ]);

    if (insertError) {
      console.error('Insert failed:', insertError);
    }
  } catch (loggingError) {
    console.error('Error inside logError:', loggingError);
  }
}