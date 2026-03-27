import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function will import all JSON files we've created and populate the pool
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting bulk import of all variations...');

    // Get all existing content to avoid duplicates
    const { data: existingContent } = await supabaseClient
      .from('cert_content_pool')
      .select('section, level, language, variation');

    const existingKeys = new Set(
      existingContent?.map(item => 
        `${item.section}-${item.level}-${item.language}-${item.variation}`
      ) || []
    );

    let inserted = 0;
    let skipped = 0;

    // We'll invoke this edge function with the content array from client
    const { items } = await req.json();

    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }

    console.log(`Processing ${items.length} items...`);

    for (const item of items) {
      const { section, level, language, version, variation, payload } = item;
      const key = `${section}-${level}-${language}-${variation}`;

      if (existingKeys.has(key)) {
        console.log(`Skipped ${key} - exists`);
        skipped++;
        continue;
      }

      const { error: insertError } = await supabaseClient
        .from('cert_content_pool')
        .insert({
          section,
          level,
          language,
          version,
          variation,
          payload,
          used_count: 0,
          usage_context: 'certification',
        });

      if (insertError) {
        console.error(`Error inserting ${key}:`, insertError);
        continue;
      }

      console.log(`✓ Inserted ${key}`);
      inserted++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        skipped,
        total: items.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Old content arrays removed - we'll send from client instead
const oldContent = [
  {
    section: "writing", level: "A1", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Describe your daily morning routine.", prompt_native: "Describe tu rutina matutina diaria.", instructions_english: "Write 40-60 words about what you do every morning.", instructions_native: "Escribe 40-60 palabras sobre lo que haces cada mañana.", expected_length: "short", topic: "daily_life" }
  },
  {
    section: "writing", level: "A2", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Write about your last vacation or trip.", prompt_native: "Escribe sobre tus últimas vacaciones o viaje.", instructions_english: "Write 60-80 words describing where you went and what you did.", instructions_native: "Escribe 60-80 palabras describiendo dónde fuiste y qué hiciste.", expected_length: "short", topic: "travel" }
  },
  {
    section: "writing", level: "B1", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Explain why learning a foreign language is important in today's world.", prompt_native: "Explica por qué es importante aprender un idioma extranjero en el mundo actual.", instructions_english: "Write 100-120 words giving reasons and examples.", instructions_native: "Escribe 100-120 palabras dando razones y ejemplos.", expected_length: "medium", topic: "education" }
  },
  {
    section: "writing", level: "B2", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Discuss the advantages and disadvantages of working from home.", prompt_native: "Discute las ventajas y desventajas de trabajar desde casa.", instructions_english: "Write 150-180 words presenting both perspectives with examples.", instructions_native: "Escribe 150-180 palabras presentando ambas perspectivas con ejemplos.", expected_length: "medium", topic: "work" }
  },
  {
    section: "writing", level: "C1", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Analyze how social media has transformed interpersonal communication in the 21st century.", prompt_native: "Analiza cómo las redes sociales han transformado la comunicación interpersonal en el siglo XXI.", instructions_english: "Write 200-250 words examining both positive and negative impacts with specific examples.", instructions_native: "Escribe 200-250 palabras examinando impactos positivos y negativos con ejemplos específicos.", expected_length: "long", topic: "technology" }
  },
  {
    section: "writing", level: "C2", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Critically evaluate the role of artificial intelligence in shaping future educational systems and its implications for human learning.", prompt_native: "Evalúa críticamente el papel de la inteligencia artificial en la configuración de los sistemas educativos futuros y sus implicaciones para el aprendizaje humano.", instructions_english: "Write 250-300 words presenting a nuanced argument with theoretical considerations and real-world examples.", instructions_native: "Escribe 250-300 palabras presentando un argumento matizado con consideraciones teóricas y ejemplos del mundo real.", expected_length: "long", topic: "education_technology" }
  },
  {
    section: "listening", level: "A1", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Hello, my name is John. I am from New York. I am 25 years old. I work in a bank. I have one brother and one sister. My brother is a doctor. My sister is a student. In my free time, I like to play soccer and watch movies. My favorite food is pizza.", questions: [{ question_english: "Where is John from?", question_native: "¿De dónde es John?", options: ["Boston", "New York", "Chicago", "Los Angeles"], correct_answer: 1 }, { question_english: "What does John's brother do?", question_native: "¿Qué hace el hermano de John?", options: ["Teacher", "Doctor", "Engineer", "Lawyer"], correct_answer: 1 }, { question_english: "What is John's favorite food?", question_native: "¿Cuál es la comida favorita de John?", options: ["Hamburgers", "Pizza", "Sushi", "Pasta"], correct_answer: 1 }] }
  },
  {
    section: "listening", level: "A2", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Good morning everyone. Welcome to City Museum. Today I'll tell you about our special exhibition on ancient Egypt. The exhibition includes real artifacts that are over 3,000 years old. You can see jewelry, tools, and even a real mummy. The tour takes about two hours. Please don't touch anything and no flash photography is allowed. The gift shop is at the exit if you want to buy souvenirs. Enjoy your visit!", questions: [{ question_english: "What is the exhibition about?", question_native: "¿De qué trata la exhibición?", options: ["Modern art", "Ancient Egypt", "Space exploration", "European history"], correct_answer: 1 }, { question_english: "How long does the tour take?", question_native: "¿Cuánto dura el tour?", options: ["One hour", "Two hours", "Three hours", "Half an hour"], correct_answer: 1 }, { question_english: "What is NOT allowed during the tour?", question_native: "¿Qué NO está permitido durante el tour?", options: ["Walking", "Looking", "Flash photography", "Listening"], correct_answer: 2 }] }
  },
  {
    section: "listening", level: "B1", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "This is an announcement for all passengers traveling to London on flight BA204. Due to technical difficulties, there will be a delay of approximately 90 minutes. We apologize for any inconvenience this may cause. Passengers will receive a complimentary meal voucher valid at any restaurant in the terminal. Please stay in the departure area and listen for further announcements. We expect boarding to begin at 3:30 PM. Thank you for your patience and understanding.", questions: [{ question_english: "Why is the flight delayed?", question_native: "¿Por qué se retrasa el vuelo?", options: ["Bad weather", "Technical difficulties", "Missing crew", "Airport closure"], correct_answer: 1 }, { question_english: "How long is the delay?", question_native: "¿Cuánto tiempo dura el retraso?", options: ["30 minutes", "60 minutes", "90 minutes", "2 hours"], correct_answer: 2 }, { question_english: "What will passengers receive?", question_native: "¿Qué recibirán los pasajeros?", options: ["Free tickets", "Hotel vouchers", "Meal vouchers", "Cash refund"], correct_answer: 2 }] }
  },
  {
    section: "listening", level: "B2", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Welcome to Business Today. In today's segment, we're discussing the impact of remote work on corporate culture. Studies show that while remote work increases flexibility and reduces commuting time, it can also lead to feelings of isolation among employees. Companies are now experimenting with hybrid models, where staff work from home part of the week and come to the office on designated days. This approach aims to maintain team cohesion while preserving the benefits of flexible work arrangements. However, implementing such models requires significant investment in technology and clear communication policies.", questions: [{ question_english: "What is the main topic of discussion?", question_native: "¿Cuál es el tema principal de discusión?", options: ["Office design", "Remote work impact on corporate culture", "Salary negotiations", "Marketing strategies"], correct_answer: 1 }, { question_english: "What problem can remote work cause?", question_native: "¿Qué problema puede causar el trabajo remoto?", options: ["Higher costs", "Feelings of isolation", "More meetings", "Less productivity"], correct_answer: 1 }, { question_english: "What do hybrid models aim to achieve?", question_native: "¿Qué buscan lograr los modelos híbridos?", options: ["Eliminate offices", "Maintain team cohesion while preserving flexibility", "Reduce salaries", "Increase working hours"], correct_answer: 1 }] }
  },
  {
    section: "listening", level: "C1", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Today on Science Matters, we're examining the latest research on neuroplasticity—the brain's remarkable ability to reorganize itself by forming new neural connections throughout life. Dr. Sarah Chen's groundbreaking study demonstrates that even elderly individuals can significantly enhance cognitive function through targeted mental exercises and lifestyle modifications. Her research challenges the long-held belief that brain development is largely complete by early adulthood. The implications are profound for treating neurodegenerative diseases and optimizing learning strategies across all age groups. However, Dr. Chen emphasizes that neuroplasticity is not unlimited and varies considerably among individuals based on genetic and environmental factors.", questions: [{ question_english: "What is neuroplasticity?", question_native: "¿Qué es la neuroplasticidad?", options: ["A disease", "The brain's ability to reorganize itself", "A medical treatment", "A type of surgery"], correct_answer: 1 }, { question_english: "What does Dr. Chen's research demonstrate?", question_native: "¿Qué demuestra la investigación de la Dra. Chen?", options: ["Brain development stops early", "Elderly individuals can enhance cognitive function", "Exercise doesn't help", "Neuroplasticity doesn't exist"], correct_answer: 1 }, { question_english: "What limitation does Dr. Chen mention about neuroplasticity?", question_native: "¿Qué limitación menciona la Dra. Chen sobre la neuroplasticidad?", options: ["It only works in children", "It is not unlimited and varies among individuals", "It requires expensive treatments", "It has no real applications"], correct_answer: 1 }] }
  },
  {
    section: "listening", level: "C2", language: "spanish", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Welcome to Philosophy Now. Today's topic explores the epistemological implications of artificial intelligence and machine learning. As AI systems become increasingly sophisticated in pattern recognition and predictive modeling, we must confront fundamental questions about the nature of knowledge itself. Can machines truly 'know' in the way humans do, or are they merely sophisticated pattern-matching algorithms devoid of genuine understanding? The Chinese Room argument, proposed by philosopher John Searle, suggests that syntactic processing—no matter how complex—does not necessarily constitute semantic understanding. Yet proponents of strong AI contend that consciousness and understanding may emerge from sufficiently complex computational systems. This debate has profound implications not only for philosophy of mind but also for how we approach AI ethics, regulation, and the potential rights of artificial entities.", questions: [{ question_english: "What philosophical question is being explored?", question_native: "¿Qué pregunta filosófica se está explorando?", options: ["Political theory", "The epistemological implications of AI", "Economic systems", "Historical analysis"], correct_answer: 1 }, { question_english: "What does the Chinese Room argument suggest?", question_native: "¿Qué sugiere el argumento de la Habitación China?", options: ["AI is superior to humans", "Syntactic processing doesn't necessarily constitute semantic understanding", "Machines can think", "Philosophy is irrelevant"], correct_answer: 1 }, { question_english: "What do proponents of strong AI believe?", question_native: "¿Qué creen los defensores de la IA fuerte?", options: ["AI will never be conscious", "Consciousness may emerge from complex computational systems", "Only humans can think", "AI should be banned"], correct_answer: 1 }] }
  }
];

const frenchContent = [
  {
    section: "writing", level: "A1", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Describe your daily morning routine.", prompt_native: "Décrivez votre routine matinale quotidienne.", instructions_english: "Write 40-60 words about what you do every morning.", instructions_native: "Écrivez 40-60 mots sur ce que vous faites chaque matin.", expected_length: "short", topic: "daily_life" }
  },
  {
    section: "writing", level: "A2", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Write about your last vacation or trip.", prompt_native: "Écrivez sur vos dernières vacances ou voyage.", instructions_english: "Write 60-80 words describing where you went and what you did.", instructions_native: "Écrivez 60-80 mots décrivant où vous êtes allé et ce que vous avez fait.", expected_length: "short", topic: "travel" }
  },
  {
    section: "writing", level: "B1", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Explain why learning a foreign language is important in today's world.", prompt_native: "Expliquez pourquoi l'apprentissage d'une langue étrangère est important dans le monde d'aujourd'hui.", instructions_english: "Write 100-120 words giving reasons and examples.", instructions_native: "Écrivez 100-120 mots en donnant des raisons et des exemples.", expected_length: "medium", topic: "education" }
  },
  {
    section: "writing", level: "B2", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Discuss the advantages and disadvantages of working from home.", prompt_native: "Discutez des avantages et des inconvénients du travail à domicile.", instructions_english: "Write 150-180 words presenting both perspectives with examples.", instructions_native: "Écrivez 150-180 mots présentant les deux perspectives avec des exemples.", expected_length: "medium", topic: "work" }
  },
  {
    section: "writing", level: "C1", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Analyze how social media has transformed interpersonal communication in the 21st century.", prompt_native: "Analysez comment les médias sociaux ont transformé la communication interpersonnelle au 21e siècle.", instructions_english: "Write 200-250 words examining both positive and negative impacts with specific examples.", instructions_native: "Écrivez 200-250 mots en examinant les impacts positifs et négatifs avec des exemples précis.", expected_length: "long", topic: "technology" }
  },
  {
    section: "writing", level: "C2", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { prompt_english: "Critically evaluate the role of artificial intelligence in shaping future educational systems and its implications for human learning.", prompt_native: "Évaluez de manière critique le rôle de l'intelligence artificielle dans la configuration des systèmes éducatifs futurs et ses implications pour l'apprentissage humain.", instructions_english: "Write 250-300 words presenting a nuanced argument with theoretical considerations and real-world examples.", instructions_native: "Écrivez 250-300 mots présentant un argument nuancé avec des considérations théoriques et des exemples concrets.", expected_length: "long", topic: "education_technology" }
  },
  {
    section: "listening", level: "A1", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Hello, my name is John. I am from New York. I am 25 years old. I work in a bank. I have one brother and one sister. My brother is a doctor. My sister is a student. In my free time, I like to play soccer and watch movies. My favorite food is pizza.", questions: [{ question_english: "Where is John from?", question_native: "D'où vient John?", options: ["Boston", "New York", "Chicago", "Los Angeles"], correct_answer: 1 }, { question_english: "What does John's brother do?", question_native: "Que fait le frère de John?", options: ["Enseignant", "Médecin", "Ingénieur", "Avocat"], correct_answer: 1 }, { question_english: "What is John's favorite food?", question_native: "Quelle est la nourriture préférée de John?", options: ["Hamburgers", "Pizza", "Sushi", "Pâtes"], correct_answer: 1 }] }
  },
  {
    section: "listening", level: "A2", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Good morning everyone. Welcome to City Museum. Today I'll tell you about our special exhibition on ancient Egypt. The exhibition includes real artifacts that are over 3,000 years old. You can see jewelry, tools, and even a real mummy. The tour takes about two hours. Please don't touch anything and no flash photography is allowed. The gift shop is at the exit if you want to buy souvenirs. Enjoy your visit!", questions: [{ question_english: "What is the exhibition about?", question_native: "De quoi parle l'exposition?", options: ["Art moderne", "Égypte ancienne", "Exploration spatiale", "Histoire européenne"], correct_answer: 1 }, { question_english: "How long does the tour take?", question_native: "Combien de temps dure la visite?", options: ["Une heure", "Deux heures", "Trois heures", "Une demi-heure"], correct_answer: 1 }, { question_english: "What is NOT allowed during the tour?", question_native: "Qu'est-ce qui N'est PAS autorisé pendant la visite?", options: ["Marcher", "Regarder", "Photographie au flash", "Écouter"], correct_answer: 2 }] }
  },
  {
    section: "listening", level: "B1", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "This is an announcement for all passengers traveling to London on flight BA204. Due to technical difficulties, there will be a delay of approximately 90 minutes. We apologize for any inconvenience this may cause. Passengers will receive a complimentary meal voucher valid at any restaurant in the terminal. Please stay in the departure area and listen for further announcements. We expect boarding to begin at 3:30 PM. Thank you for your patience and understanding.", questions: [{ question_english: "Why is the flight delayed?", question_native: "Pourquoi le vol est-il retardé?", options: ["Mauvais temps", "Difficultés techniques", "Équipage manquant", "Fermeture de l'aéroport"], correct_answer: 1 }, { question_english: "How long is the delay?", question_native: "Quelle est la durée du retard?", options: ["30 minutes", "60 minutes", "90 minutes", "2 heures"], correct_answer: 2 }, { question_english: "What will passengers receive?", question_native: "Que recevront les passagers?", options: ["Billets gratuits", "Bons d'hôtel", "Bons de repas", "Remboursement en espèces"], correct_answer: 2 }] }
  },
  {
    section: "listening", level: "B2", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Welcome to Business Today. In today's segment, we're discussing the impact of remote work on corporate culture. Studies show that while remote work increases flexibility and reduces commuting time, it can also lead to feelings of isolation among employees. Companies are now experimenting with hybrid models, where staff work from home part of the week and come to the office on designated days. This approach aims to maintain team cohesion while preserving the benefits of flexible work arrangements. However, implementing such models requires significant investment in technology and clear communication policies.", questions: [{ question_english: "What is the main topic of discussion?", question_native: "Quel est le sujet principal de discussion?", options: ["Conception de bureau", "Impact du travail à distance sur la culture d'entreprise", "Négociations salariales", "Stratégies marketing"], correct_answer: 1 }, { question_english: "What problem can remote work cause?", question_native: "Quel problème le travail à distance peut-il causer?", options: ["Coûts plus élevés", "Sentiments d'isolement", "Plus de réunions", "Moins de productivité"], correct_answer: 1 }, { question_english: "What do hybrid models aim to achieve?", question_native: "Que visent à réaliser les modèles hybrides?", options: ["Éliminer les bureaux", "Maintenir la cohésion d'équipe tout en préservant la flexibilité", "Réduire les salaires", "Augmenter les heures de travail"], correct_answer: 1 }] }
  },
  {
    section: "listening", level: "C1", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Today on Science Matters, we're examining the latest research on neuroplasticity—the brain's remarkable ability to reorganize itself by forming new neural connections throughout life. Dr. Sarah Chen's groundbreaking study demonstrates that even elderly individuals can significantly enhance cognitive function through targeted mental exercises and lifestyle modifications. Her research challenges the long-held belief that brain development is largely complete by early adulthood. The implications are profound for treating neurodegenerative diseases and optimizing learning strategies across all age groups. However, Dr. Chen emphasizes that neuroplasticity is not unlimited and varies considerably among individuals based on genetic and environmental factors.", questions: [{ question_english: "What is neuroplasticity?", question_native: "Qu'est-ce que la neuroplasticité?", options: ["Une maladie", "La capacité du cerveau à se réorganiser", "Un traitement médical", "Un type de chirurgie"], correct_answer: 1 }, { question_english: "What does Dr. Chen's research demonstrate?", question_native: "Que démontre la recherche du Dr Chen?", options: ["Le développement du cerveau s'arrête tôt", "Les personnes âgées peuvent améliorer leur fonction cognitive", "L'exercice n'aide pas", "La neuroplasticité n'existe pas"], correct_answer: 1 }, { question_english: "What limitation does Dr. Chen mention about neuroplasticity?", question_native: "Quelle limitation le Dr Chen mentionne-t-il concernant la neuroplasticité?", options: ["Elle ne fonctionne que chez les enfants", "Elle n'est pas illimitée et varie selon les individus", "Elle nécessite des traitements coûteux", "Elle n'a pas d'applications réelles"], correct_answer: 1 }] }
  },
  {
    section: "listening", level: "C2", language: "french", version: "v1-gpt4o-mini", variation: 1,
    payload: { script: "Welcome to Philosophy Now. Today's topic explores the epistemological implications of artificial intelligence and machine learning. As AI systems become increasingly sophisticated in pattern recognition and predictive modeling, we must confront fundamental questions about the nature of knowledge itself. Can machines truly 'know' in the way humans do, or are they merely sophisticated pattern-matching algorithms devoid of genuine understanding? The Chinese Room argument, proposed by philosopher John Searle, suggests that syntactic processing—no matter how complex—does not necessarily constitute semantic understanding. Yet proponents of strong AI contend that consciousness and understanding may emerge from sufficiently complex computational systems. This debate has profound implications not only for philosophy of mind but also for how we approach AI ethics, regulation, and the potential rights of artificial entities.", questions: [{ question_english: "What philosophical question is being explored?", question_native: "Quelle question philosophique est explorée?", options: ["Théorie politique", "Les implications épistémologiques de l'IA", "Systèmes économiques", "Analyse historique"], correct_answer: 1 }, { question_english: "What does the Chinese Room argument suggest?", question_native: "Que suggère l'argument de la Chambre chinoise?", options: ["L'IA est supérieure aux humains", "Le traitement syntaxique ne constitue pas nécessairement une compréhension sémantique", "Les machines peuvent penser", "La philosophie est sans importance"], correct_answer: 1 }, { question_english: "What do proponents of strong AI believe?", question_native: "Que croient les partisans de l'IA forte?", options: ["L'IA ne sera jamais consciente", "La conscience peut émerger de systèmes computationnels complexes", "Seuls les humains peuvent penser", "L'IA devrait être interdite"], correct_answer: 1 }] }
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allContent = [...spanishContent, ...frenchContent];
    console.log(`Importing ${allContent.length} content items...`);

    let inserted = 0;
    let skipped = 0;

    for (const item of allContent) {
      const { section, level, language, version, variation, payload } = item;

      // Check if exists
      const { data: existing } = await supabaseClient
        .from('cert_content_pool')
        .select('id')
        .eq('section', section)
        .eq('level', level)
        .eq('language', language)
        .eq('version', version)
        .eq('variation', variation)
        .maybeSingle();

      if (existing) {
        console.log(`Skipped ${language} ${section} ${level} v${variation}`);
        skipped++;
        continue;
      }

      // Insert
      const { error: insertError } = await supabaseClient
        .from('cert_content_pool')
        .insert({
          section,
          level,
          language,
          version,
          variation,
          payload,
          used_count: 0,
          usage_context: 'certification',
        });

      if (insertError) {
        console.error(`Error inserting ${language} ${section} ${level}:`, insertError);
        throw insertError;
      }

      console.log(`✓ Inserted ${language} ${section} ${level} v${variation}`);
      inserted++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        skipped,
        total: allContent.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
