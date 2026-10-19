import type { BattleState, Campaign, Command, Difficulty, GameContent } from './contracts';

export interface ResultsData { victory: boolean; score: number; reward: number; missionId: string }
export interface UIOptions {
  parent: HTMLElement;
  content: GameContent;
  campaign: Campaign;
  savedBattle: BattleState | null;
  onStart(missionId: string, resume: boolean): void;
  onCommand(command: Command): void;
  onBuySkill(id: string): string | null;
  onRespec(): string | null;
  onLanguageChange(language: 'en' | 'ar'): void;
  onDifficultyChange?(difficulty: Difficulty): Promise<void>;
  onExport(): Promise<void>;
  onImport(file: File): Promise<void>;
  onOffline(progress: (value: number) => void): Promise<void>;
  onSave(): Promise<void>;
  onLeave(): void;
}
export interface GameUI {
  beginBattle(missionId: string): void;
  setState(state: BattleState): void;
  setCampaign(campaign: Campaign, savedBattle?: BattleState | null): void;
  showResults(results: ResultsData): void;
  showCampaign(): void;
  notify(message: string): void;
  destroy(): void;
}
