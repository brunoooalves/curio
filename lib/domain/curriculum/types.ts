export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Concept {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
}

export interface Module {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  concepts: Concept[];
  prerequisites: string[];
}

export interface Curriculum {
  id: string;
  title: string;
  description: string;
  domain: string;
  modules: Module[];
}
