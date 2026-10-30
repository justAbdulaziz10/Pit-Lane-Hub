import { sharedStats } from './drivers';

const standings = {
    en: {
        ...sharedStats.en,
        pageTitle: '{year} Standings',
        afterRound: 'After round {round}',
        noStandings: 'No {year} standings yet',
        previousFinal: '{year} final standings',
        driversChampionship: "Drivers' championship",
        constructorsChampionship: "Constructors' championship",
        driversChampionshipCaption: "{year} Drivers' Championship",
        constructorsChampionshipCaption: "{year} Constructors' Championship",
        constructorsStandingsMissing: "No {year} constructors' standings yet",
        constructorsChampionshipTitle: "Constructors' Championship",
        firstAwarded: 'First awarded in',
        positionShort: 'Pos',
        gapToLeader: 'Gap',
        leader: 'Leader',
        tiedOnPoints: 'Tied on points',
        driver: 'Driver',
        team: 'Team',
        season: 'Season',
        show: 'Show',
        previousSeason: '{year} season',
        nextSeason: '{year} season',
        metadataTitleBoth: '{year} F1 Driver and Constructor Standings',
        metadataTitleDrivers: "{year} F1 Drivers' Championship Standings",
        metadataDescriptionBoth: "Formula 1 {year} drivers' and constructors' championship standings: positions, points and wins.",
        metadataDescriptionDrivers: "Formula 1 {year} drivers' championship standings: positions, points and wins.",
    },
};

export default standings;
