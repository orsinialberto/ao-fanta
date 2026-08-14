export type TeamSummary = {
  id: string;
  name: string;
  remainingCredits: number;
};

export type PlayerWithTeam = {
  id: string;
  name: string;
  role: string;
  serieATeam: string;
  cost: number | null;
  starter: boolean;
  watchlist: boolean;
  fantasyTeam: { id: string; name: string } | null;
};
