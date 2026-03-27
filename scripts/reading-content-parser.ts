/**
 * Reading Content Parser
 * 
 * This script converts the parsed PDF reading content into the format
 * needed for cert_content_pool import.
 * 
 * Manual extraction from PDF required - paste the reading passages and questions here.
 */

export const readingContent = [
  // A1 - Variation 1
  {
    section: "reading",
    level: "A1",
    variation: 1,
    payload: {
      prompt: "My name is Tom. I am nine years old. I have a dog. His name is Buddy. Buddy is small and brown. Every afternoon, I feed Buddy and play with him in the garden. He likes to chase a red ball. I love Buddy very much.",
      questions: [
        {
          id: "q1",
          text: "What kind of animal is Buddy?",
          options: [
            { id: "a", text: "Cat", isCorrect: false },
            { id: "b", text: "Rabbit", isCorrect: false },
            { id: "c", text: "Dog", isCorrect: true },
            { id: "d", text: "Bird", isCorrect: false }
          ]
        },
        {
          id: "q2",
          text: "When does Tom play with Buddy?",
          options: [
            { id: "a", text: "In the morning", isCorrect: false },
            { id: "b", text: "At noon", isCorrect: false },
            { id: "c", text: "At night", isCorrect: false },
            { id: "d", text: "Every afternoon", isCorrect: true }
          ]
        }
      ]
    }
  },
  // A1 - Variation 2
  {
    section: "reading",
    level: "A1",
    variation: 2,
    payload: {
      prompt: "Every morning, I wake up at 7 o'clock. I brush my teeth and eat breakfast. I go to school at 8 o'clock. At school, I study and play with my friends. In the afternoon, I go home and do my homework. After dinner, I watch TV with my family. I go to bed at 9 o'clock.",
      questions: [
        {
          id: "q1",
          text: "What time does he wake up?",
          options: [
            { id: "a", text: "6 o'clock", isCorrect: false },
            { id: "b", text: "7 o'clock", isCorrect: true },
            { id: "c", text: "8 o'clock", isCorrect: false },
            { id: "d", text: "9 o'clock", isCorrect: false }
          ]
        },
        {
          id: "q2",
          text: "What does he do after dinner?",
          options: [
            { id: "a", text: "He does his homework", isCorrect: false },
            { id: "b", text: "He plays outside", isCorrect: false },
            { id: "c", text: "He watches TV with his family", isCorrect: true },
            { id: "d", text: "He goes to bed", isCorrect: false }
          ]
        }
      ]
    }
  },
  // NOTE: Due to the PDF's inconsistent formatting, you'll need to manually complete
  // all 48 reading items (8 per level × 6 levels) following this structure.
  // 
  // Each item needs:
  // - section: "reading"
  // - level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  // - variation: 1-8
  // - payload: { prompt: string, questions: array }
];
