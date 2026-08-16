import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { TIER_ORDER, TIER_LABELS, groupByTier } from "@/lib/wishlist";
import { readSearchParams } from "@/lib/filterParams";
import PageHeader from "@/app/components/PageHeader";
import ListoneToolbar from "../players/ListoneToolbar";
import PlayersTable from "../players/PlayersTable";
import ResetWishlistButtons from "./ResetWishlistButtons";
import TierSection from "./TierSection";

export const dynamic = "force-dynamic";

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = readSearchParams(params);

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    // The route is the filter: only free agents, only players in a list, always.
    // The tier filter is forced past whatever the URL says — here the sections
    // are the tiers, so filtering by tier on top of them would say it twice.
    getFilteredPlayers({
      ...filters,
      wishlistTier: [...TIER_ORDER],
      freeAgentOnly: true,
      starterOnly: false,
    }),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  const teamSummaries = teams.map((t) => ({
    id: t.id,
    name: t.name,
    remainingCredits: t.remainingCredits,
    roleCounts: t.roleCounts,
  }));

  const groups = groupByTier(players);

  return (
    <>
      <PageHeader
        title="Wishlist"
        subtitle="Solo svincolati. Sposta un giocatore fra le liste dalle pillole A/B/C."
      />
      <ListoneToolbar
        serieATeams={serieATeams}
        resultCount={players.length}
        showStatusToggles={false}
      />
      <div className="mt-3 flex justify-end">
        <ResetWishlistButtons />
      </div>
      {TIER_ORDER.map((tier) => (
        <TierSection
          key={tier}
          tier={tier}
          title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
          count={groups[tier].length}
        >
          {groups[tier].length === 0 ? (
            // Empty sections stay on the page so its shape does not depend on
            // the data. EmptyState is too heavy to repeat three times here.
            <p className="border-t border-line py-4 text-small text-ink-3">
              Nessun giocatore in questa lista.
            </p>
          ) : (
            <PlayersTable
              players={groups[tier]}
              teams={teamSummaries}
              roleLimits={roleLimits}
              showCost={false}
            />
          )}
        </TierSection>
      ))}
    </>
  );
}
