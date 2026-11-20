import type { LogKind } from '@/lib/live';

/**
 * What a person can say a drink or snack was, to make the log feel like a journal and not a counter. Everything here
 * is about taste and memory: never amounts, never strength. Sizes only describe the serving.
 */
export const ITEMS: Record<Exclude<LogKind, 'moment'>, { items: string[]; sizes?: string[]; prompt: string }> = {
  beer: {
    prompt: 'What was it?',
    items: ['Lager', 'Pilsner', 'Pale ale', 'IPA', 'Hazy IPA', 'Stout', 'Sour', 'Wheat', 'Cider', 'Non-alcoholic'],
    sizes: ['Taster', 'Half pint', 'Pint', 'Bottle or can', 'Flight'],
  },
  cocktail: {
    prompt: 'Which one?',
    items: ['Old Fashioned', 'Margarita', 'Negroni', 'Espresso Martini', 'Spritz', 'Mojito', 'Moscow Mule', 'Gin & Tonic', 'Caesar', 'House special', 'Mocktail'],
  },
  shot: {
    prompt: 'What was it?',
    items: ['Tequila', 'Whisky', 'Vodka', 'Rum', 'Liqueur', 'Something sweet', 'Bartender’s pick'],
  },
  wine: {
    prompt: 'What was it?',
    items: ['Red', 'White', 'Rosé', 'Sparkling', 'Orange wine', 'Sake'],
    sizes: ['Taster', 'Glass', 'Bottle for the table'],
  },
  water: {
    prompt: 'What kind?',
    items: ['Tap water', 'Sparkling', 'With lemon', 'Tea'],
  },
  food: {
    prompt: 'What did you eat?',
    items: ['Fries', 'Poutine', 'Burger', 'Tacos', 'Pizza', 'Wings', 'Noodles', 'Sushi', 'Dessert', 'Something to share'],
  },
};

/** Quick price picks (CAD). The person can also type their own. */
export const PRICES = [0, 5, 7, 9, 12, 15, 20];

const ICON = { beer: 'beer', cocktail: 'glass-cocktail', shot: 'glass-tulip', wine: 'glass-wine', water: 'cup-water', food: 'food' } as const;
const COLOR = { beer: '#FFB020', cocktail: '#FF3D81', shot: '#B06BFF', wine: '#E0457B', water: '#2D9CFF', food: '#37E08A' } as const;
const LABEL = { beer: 'Beer', cocktail: 'Cocktail', shot: 'Shot', wine: 'Wine', water: 'Water', food: 'Food' } as const;

export const drinkMeta = (kind: Exclude<LogKind, 'moment'>) => ({ icon: ICON[kind], color: COLOR[kind], label: LABEL[kind] });
