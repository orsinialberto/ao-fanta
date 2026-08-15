import type { Role } from "@/lib/roles";

export type TeamSummary = {
  id: string;
  name: string;
  remainingCredits: number;
  roleCounts: Record<Role, number>;
};

export type PlayerWithTeam = {
  id: string;
  name: string;
  role: string;
  serieATeam: string;
  cost: number | null;
  starter: boolean;
  watchlist: boolean;
  wishlistTier: string | null;
  fantasyTeam: { id: string; name: string } | null;
};
