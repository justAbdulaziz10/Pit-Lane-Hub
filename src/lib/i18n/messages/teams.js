import { sharedStats } from './drivers';

const teams = {
    en: {
        ...sharedStats.en,
        pageTitle: '{year} Teams',
        afterRound: "Constructors' standings after round {round}",
        noTeams: 'No {year} teams announced yet.',
        teamDrivers: '{team} drivers',
        metadataTitle: 'F1 Teams: Constructors and Drivers',
        metadataDescription: 'Every Formula 1 team on the current grid with its drivers, championship position and points.',
        metadataDetailTitle: '{name}: F1 Team Drivers, Standings and History',
        currentTeamDescription: '{name} in Formula 1: current drivers, championship position, race wins and titles.',
        historicalTeamDescription: '{name} in Formula 1: race wins, championships and seasons entered.',
        allTeams: 'All teams',
        season: '{year} season',
        position: 'Position',
        nationality: 'Nationality',
        seasonDrivers: '{year} drivers',
        allTimeRecord: 'All-time record',
        constructorTitles: "Constructors' titles",
        raceWins: 'Race wins',
        grandsPrix: 'Grands Prix',
        championshipSeasons: 'Championship seasons',
    },
};

export default teams;
