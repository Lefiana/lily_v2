// apps/backend/prisma/seed-habits.ts
import { PrismaClient, HabitDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

const habitTemplates = [
  // Exercise & Fitness
  {
    title: "Morning Stretch",
    description: "Do a 5-minute full body stretch routine",
    category: "EXERCISE",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "10 Push-ups",
    description: "Complete 10 push-ups (can be knee push-ups)",
    category: "EXERCISE",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 4,
  },
  {
    title: "30-Minute Walk",
    description: "Take a brisk 30-minute walk outside",
    category: "EXERCISE",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 3,
    weight: 5,
  },
  {
    title: "20-Minute Workout",
    description: "Complete a 20-minute workout session",
    category: "EXERCISE",
    difficulty: HabitDifficulty.ADVANCED,
    minLevel: 5,
    weight: 3,
  },
  {
    title: "1-Hour Gym Session",
    description: "Complete a full 1-hour gym workout",
    category: "EXERCISE",
    difficulty: HabitDifficulty.EXPERT,
    minLevel: 10,
    weight: 2,
  },

  // Mindfulness & Mental Health
  {
    title: "5-Minute Meditation",
    description: "Practice mindfulness meditation for 5 minutes",
    category: "MINDFULNESS",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "Deep Breathing",
    description: "Take 10 deep breaths, focusing on each inhale and exhale",
    category: "MINDFULNESS",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "Gratitude Journal",
    description: "Write down 3 things you're grateful for today",
    category: "MINDFULNESS",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 2,
    weight: 4,
  },
  {
    title: "15-Minute Meditation",
    description: "Practice guided or silent meditation for 15 minutes",
    category: "MINDFULNESS",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 5,
    weight: 3,
  },
  {
    title: "Digital Detox Hour",
    description: "Spend one hour without any digital devices",
    category: "MINDFULNESS",
    difficulty: HabitDifficulty.ADVANCED,
    minLevel: 8,
    weight: 2,
  },

  // Learning & Growth
  {
    title: "Read 10 Pages",
    description: "Read at least 10 pages of a book",
    category: "LEARNING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "Learn One New Word",
    description: "Learn and use a new vocabulary word today",
    category: "LEARNING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 4,
  },
  {
    title: "Watch Educational Video",
    description: "Watch a 15-minute educational video or documentary",
    category: "LEARNING",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 3,
    weight: 4,
  },
  {
    title: "Practice Skill for 30 Minutes",
    description: "Spend 30 minutes practicing a skill you're learning",
    category: "LEARNING",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 4,
    weight: 3,
  },
  {
    title: "Complete Online Course Lesson",
    description: "Complete one lesson from an online course",
    category: "LEARNING",
    difficulty: HabitDifficulty.ADVANCED,
    minLevel: 7,
    weight: 2,
  },

  // Morning Routines
  {
    title: "Make Your Bed",
    description: "Start the day by making your bed",
    category: "MORNING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "Drink Water First",
    description: "Drink a glass of water immediately after waking up",
    category: "MORNING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "Morning Shower",
    description: "Take a refreshing shower to start your day",
    category: "MORNING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 4,
  },
  {
    title: "Healthy Breakfast",
    description: "Prepare and eat a nutritious breakfast",
    category: "MORNING",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 3,
    weight: 4,
  },
  {
    title: "Morning Planning",
    description: "Spend 10 minutes planning your day and priorities",
    category: "MORNING",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 4,
    weight: 4,
  },

  // Evening Routines
  {
    title: "No Screens 1 Hour Before Bed",
    description: "Avoid all screens for 1 hour before sleeping",
    category: "EVENING",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 3,
    weight: 4,
  },
  {
    title: "Prepare Tomorrow's Outfit",
    description: "Choose and prepare your clothes for tomorrow",
    category: "EVENING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 2,
    weight: 3,
  },
  {
    title: "Evening Stretch",
    description: "Do gentle stretches before bed to relax",
    category: "EVENING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 4,
  },
  {
    title: "Read Before Bed",
    description: "Read for 15-20 minutes before sleeping",
    category: "EVENING",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 2,
    weight: 4,
  },
  {
    title: "Bedtime at 10 PM",
    description: "Go to bed by 10 PM for adequate rest",
    category: "EVENING",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 5,
    weight: 3,
  },

  // Productivity
  {
    title: "Drink 8 Glasses of Water",
    description: "Stay hydrated throughout the day",
    category: "PRODUCTIVITY",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 1,
    weight: 5,
  },
  {
    title: "Inbox Zero",
    description: "Clear all emails and notifications",
    category: "PRODUCTIVITY",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 4,
    weight: 3,
  },
  {
    title: "2-Minute Task Rule",
    description: "Complete any task that takes less than 2 minutes immediately",
    category: "PRODUCTIVITY",
    difficulty: HabitDifficulty.BEGINNER,
    minLevel: 2,
    weight: 4,
  },
  {
    title: "No Multitasking",
    description: "Focus on one task at a time without switching",
    category: "PRODUCTIVITY",
    difficulty: HabitDifficulty.ADVANCED,
    minLevel: 6,
    weight: 2,
  },
  {
    title: "Pomodoro Session",
    description: "Complete a full 25-minute focused work session",
    category: "PRODUCTIVITY",
    difficulty: HabitDifficulty.INTERMEDIATE,
    minLevel: 5,
    weight: 3,
  },
];

async function main() {
  console.log('🌱 Seeding habit templates...');

  // Clear existing templates
  await prisma.habitTemplate.deleteMany({});
  console.log('🗑️  Cleared existing habit templates');

  // Create all templates
  const created = await prisma.habitTemplate.createMany({
    data: habitTemplates,
  });

  console.log(`✅ Created ${created.count} habit templates!`);
  
  // Log categories summary
  const categories = [...new Set(habitTemplates.map(h => h.category))];
  console.log('\n📊 Categories:');
  categories.forEach(cat => {
    const count = habitTemplates.filter(h => h.category === cat).length;
    console.log(`   • ${cat}: ${count} habits`);
  });

  console.log(`\n🎉 Successfully seeded habit templates!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding habits:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
