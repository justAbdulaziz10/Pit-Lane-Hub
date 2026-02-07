export const TRACK_COORDS = {
    'bahrain': { lat: 26.0325, lng: 50.5106, country: 'Bahrain', title: 'Bahrain International Circuit', image: '/tracks/bahrain.png' },
    'jeddah': { lat: 21.6319, lng: 39.1044, country: 'Saudi Arabia', title: 'Jeddah Corniche Circuit', image: '/tracks/ksa.png' },
    'melbourne': { lat: -37.8497, lng: 144.968, country: 'Australia', title: 'Albert Park Circuit', image: '/tracks/australia.png' },
    'suzuka': { lat: 34.8432, lng: 136.5409, country: 'Japan', title: 'Suzuka Circuit', image: '/tracks/japan.png' },
    'shanghai': { lat: 31.3389, lng: 121.2197, country: 'China', title: 'Shanghai International Circuit', image: '/tracks/china.png' },
    'miami': { lat: 25.9581, lng: -80.2389, country: 'USA', title: 'Miami International Autodrome', image: '/tracks/miami.png' },
    'imola': { lat: 44.3439, lng: 11.7133, country: 'Italy', title: 'Autodromo Enzo e Dino Ferrari', image: '/tracks/italy.png' },
    'monaco': { lat: 43.7347, lng: 7.4206, country: 'Monaco', title: 'Circuit de Monaco', image: '/tracks/monaco.png' },
    'montreal': { lat: 45.5048, lng: -73.5262, country: 'Canada', title: 'Circuit Gilles Villeneuve', image: '/tracks/canada.png' },
    'barcelona': { lat: 41.57, lng: 2.2611, country: 'Spain', title: 'Circuit de Barcelona-Catalunya', image: '/tracks/spain.png' },
    'spielberg': { lat: 47.2197, lng: 14.7647, country: 'Austria', title: 'Red Bull Ring', image: '/tracks/austria.png' },
    'silverstone': { lat: 52.0733, lng: -1.0147, country: 'UK', title: 'Silverstone Circuit', image: '/tracks/uk.png' },
    'budapest': { lat: 47.5789, lng: 19.2486, country: 'Hungary', title: 'Hungaroring', image: '/tracks/hungary.png' },
    'spa': { lat: 50.4372, lng: 5.9714, country: 'Belgium', title: 'Circuit de Spa-Francorchamps', image: '/tracks/belgium.png' },
    'zandvoort': { lat: 52.3888, lng: 4.5409, country: 'Netherlands', title: 'Circuit Zandvoort', image: '/tracks/netherlands.png' },
    'monza': { lat: 45.6156, lng: 9.2811, country: 'Italy', title: 'Autodromo Nazionale Monza', image: '/tracks/italy.png' },
    'baku': { lat: 40.3725, lng: 49.8533, country: 'Azerbaijan', title: 'Baku City Circuit', image: '/tracks/azerbaijan.png' },
    'singapore': { lat: 1.2914, lng: 103.8644, country: 'Singapore', title: 'Marina Bay Street Circuit', image: '/tracks/singapore.png' },
    'austin': { lat: 30.1328, lng: -97.6411, country: 'USA', title: 'Circuit of the Americas', image: '/tracks/usa.png' },
    'mexico': { lat: 19.4042, lng: -99.0907, country: 'Mexico', title: 'Autódromo Hermanos Rodríguez', image: '/tracks/mexico.png' },
    'sao paulo': { lat: -23.7036, lng: -46.6997, country: 'Brazil', title: 'Interlagos Circuit', image: '/tracks/brazil.png' },
    'las vegas': { lat: 36.1147, lng: -115.173, country: 'USA', title: 'Las Vegas Strip Circuit', image: '/tracks/usa.png' },
    'lusail': { lat: 25.49, lng: 51.4542, country: 'Qatar', title: 'Lusail International Circuit', image: '/tracks/qatar.png' },
    'yas marina': { lat: 24.4672, lng: 54.6031, country: 'UAE', title: 'Yas Marina Circuit', image: '/tracks/uae.png' },
};

export const getTrackInfo = (raceName, circuitKey) => {
    if (!raceName && !circuitKey) return null;

    // Normalize inputs
    const name = raceName ? String(raceName).toLowerCase() : '';
    const key = circuitKey ? String(circuitKey).toLowerCase() : '';

    for (const [coordKey, value] of Object.entries(TRACK_COORDS)) {
        // Check if circuit key matches the coordinate key directly
        if (key && (key === coordKey || key.includes(coordKey) || coordKey.includes(key))) {
            return value;
        }
        // Check if race name contains the coordinate key
        if (name && name.includes(coordKey)) {
            return value;
        }
    }
    return null;
};
