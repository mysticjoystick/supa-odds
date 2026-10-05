// Team colours — each club maps to the prominent colour(s) in its logo so the
// win-% bars / numbers feel colourful instead of generic green/blue.
//
// Design:
//  - TEAM_COLORS stores AUTHENTIC logo tones (no pre-brightening). Values are
//    either a single hex or a [primary, secondary] pair for two-tone clubs
//    (Barcelona garnet+blue, Lakers purple+gold, …).
//  - Bars use the true tones (gently lifted only when too dark to see) —
//    pairs render as a two-stop gradient so both colours show.
//  - % text / dots use teamInk(): the primary lifted for readability, with a
//    hue guard so dark crimsons can't drift into pink.
//  - Clubs not in the map get a vivid hashed fallback instantly, upgraded to
//    the extracted badge colour once TeamCrest has seen the logo.

import { useEffect, useState } from 'react';

function normalize(name = '') {
  return String(name || '')
    .toLowerCase()
    .trim()
    .normalize('NFD') // strip accents so Atlético → atletico, never "atl tico"
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’.]/g, '')
    .replace(/\bfc\b|\bcf\b|\bsc\b|\bac\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES = {
  'man city': 'manchester city',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'spurs': 'tottenham hotspur',
  'tottenham': 'tottenham hotspur',
  'barca': 'barcelona',
  'real': 'real madrid',
  'atleti': 'atletico madrid',
  'athletico madrid': 'atletico madrid',
  'psg': 'paris saint germain',
  'paris': 'paris saint germain',
  'bayern': 'bayern munich',
  'dortmund': 'borussia dortmund',
  'inter milan': 'inter',
  'ac milan': 'milan',
  'la lakers': 'los angeles lakers',
  'lakers': 'los angeles lakers',
  'celtics': 'boston celtics',
  'celts': 'boston celtics',
  'dubs': 'golden state warriors',
  'warriors': 'golden state warriors',
  'sixers': 'philadelphia 76ers',
  'gunners': 'arsenal',
  'villa': 'aston villa',
  'forest': 'nottingham forest',
  'palace': 'crystal palace',
  'hammers': 'west ham',
  'niners': 'san francisco 49ers',
  'pats': 'new england patriots',
  'bucs': 'tampa bay buccaneers',
  'az': 'az alkmaar',
  'deportivo': 'deportivo la coruna',
  'rc deportivo de a coruna': 'deportivo la coruna',
  'nyc': 'new york city',
};

// Authentic logo tones. Pair = [primary, secondary]; bars render the pair as
// a gradient so both club colours show (stripes / sash / trim).
const TEAM_COLORS = {
  // --- Premier League ---
  'arsenal': '#EF0107',
  'aston villa': ['#670E36', '#95BFE5'],
  'bournemouth': '#DA291C',
  'brentford': ['#E30613', '#FFFFFF'],
  'brighton': ['#0057B8', '#FFFFFF'],
  'brighton hove albion': ['#0057B8', '#FFFFFF'],
  'burnley': ['#6C1D45', '#99D6EA'],
  'chelsea': '#034694',
  'crystal palace': ['#1B458F', '#C4122E'],
  'everton': '#003399',
  'fulham': '#E8EAED',
  'ipswich': ['#005EB8', '#FFFFFF'],
  'ipswich town': ['#005EB8', '#FFFFFF'],
  'leeds': ['#FFCD00', '#1D428A'],
  'leeds united': ['#FFCD00', '#1D428A'],
  'leicester': '#003090',
  'leicester city': '#003090',
  'liverpool': '#C8102E',
  'manchester city': ['#6CABDD', '#1C2C5B'],
  'manchester united': ['#DA291C', '#1A1A1A'],
  'newcastle': '#C9CDD6',
  'newcastle united': '#C9CDD6',
  'nottingham forest': '#DD0000',
  'nottingham': '#DD0000',
  'southampton': '#D71920',
  'tottenham hotspur': ['#132257', '#FFFFFF'],
  'west ham': ['#7A263A', '#1BB1E7'],
  'west ham united': ['#7A263A', '#1BB1E7'],
  'wolves': ['#FDB913', '#231F20'],
  'wolverhampton': ['#FDB913', '#231F20'],
  'sunderland': ['#E8102E', '#FFFFFF'],
  // --- La Liga ---
  'real madrid': ['#FEBE10', '#00529F'],
  'barcelona': ['#A50044', '#004D98'],
  'atletico madrid': ['#CB3524', '#272E61'],
  'athletic bilbao': '#EE2523',
  'athletic club': '#EE2523',
  'real sociedad': ['#0067B1', '#FFFFFF'],
  'villarreal': '#FFE667',
  'real betis': ['#00954C', '#FFFFFF'],
  'betis': ['#00954C', '#FFFFFF'],
  'sevilla': ['#FFFFFF', '#D00027'],
  'valencia': ['#FFFFFF', '#FF7A00'],
  'girona': ['#CD2534', '#FFFFFF'],
  'getafe': '#00538B',
  'celta vigo': ['#6CB8E8', '#FFFFFF'],
  'celta': ['#6CB8E8', '#FFFFFF'],
  'osasuna': ['#D42A2A', '#0A1E46'],
  'mallorca': '#E11D2E',
  // --- Serie A ---
  'inter': ['#0068A8', '#1A1A1A'],
  'internazionale': ['#0068A8', '#1A1A1A'],
  'milan': ['#FB090B', '#1A1A1A'],
  'juventus': ['#FFFFFF', '#3A3F4B'],
  'napoli': '#12A0D7',
  'roma': ['#8E1F2F', '#F0BC42'],
  'lazio': '#87D8F7',
  'atalanta': ['#1E71B8', '#1A1A1A'],
  'fiorentina': '#582C83',
  'bologna': ['#A31F34', '#00205B'],
  'torino': '#7A1F2A',
  // --- Bundesliga ---
  'bayern munich': '#DC052D',
  'borussia dortmund': ['#FDE100', '#1A1A1A'],
  'leverkusen': ['#E32221', '#1A1A1A'],
  'bayer leverkusen': ['#E32221', '#1A1A1A'],
  'leipzig': ['#DD0741', '#001E46'],
  'rb leipzig': ['#DD0741', '#001E46'],
  'stuttgart': ['#E32219', '#FFFFFF'],
  'vfb stuttgart': ['#E32219', '#FFFFFF'],
  'monchengladbach': ['#FFFFFF', '#009444'],
  'wolfsburg': ['#65B32E', '#FFFFFF'],
  'eintracht frankfurt': ['#E1000F', '#1A1A1A'],
  'frankfurt': ['#E1000F', '#1A1A1A'],
  // --- Ligue 1 ---
  'paris saint germain': ['#004170', '#DA291C'],
  'marseille': ['#2FAEE0', '#FFFFFF'],
  'monaco': ['#E63312', '#FFFFFF'],
  'lyon': ['#DA291C', '#0A1E46'],
  'olympique lyonnais': ['#DA291C', '#0A1E46'],
  'lille': ['#E01E13', '#0A1E46'],
  'lens': ['#FFF200', '#EE0000'],
  'rc lens': ['#FFF200', '#EE0000'],
  // --- Other UCL ---
  'ajax': ['#D2122E', '#FFFFFF'],
  'porto': ['#014DAC', '#FFFFFF'],
  'benfica': '#EF0000',
  'sporting': ['#008057', '#FFFFFF'],
  'sporting cp': ['#008057', '#FFFFFF'],
  'celtic': ['#018749', '#FFFFFF'],
  'rangers': '#1B458F',
  'psv': ['#ED1C24', '#FFFFFF'],
  'psv eindhoven': ['#ED1C24', '#FFFFFF'],
  'feyenoord': ['#CC0000', '#FFFFFF'],
  'shakhtar': ['#F26522', '#1A1A1A'],
  'shakhtar donetsk': ['#F26522', '#1A1A1A'],
  // --- NBA ---
  'atlanta hawks': ['#E03A3E', '#1A1A1A'],
  'hawks': ['#E03A3E', '#1A1A1A'],
  'boston celtics': '#007A33',
  'brooklyn nets': ['#1A1A1A', '#FFFFFF'],
  'nets': ['#1A1A1A', '#FFFFFF'],
  'charlotte hornets': ['#1D1160', '#00788C'],
  'hornets': ['#1D1160', '#00788C'],
  'chicago bulls': ['#CE1141', '#1A1A1A'],
  'bulls': ['#CE1141', '#1A1A1A'],
  'cleveland cavaliers': '#860038',
  'cavaliers': '#860038',
  'cavs': '#860038',
  'dallas mavericks': '#00538C',
  'mavericks': '#00538C',
  'mavs': '#00538C',
  'denver nuggets': ['#0E2240', '#FEC524'],
  'nuggets': ['#0E2240', '#FEC524'],
  'detroit pistons': ['#C8102E', '#006BB6'],
  'pistons': ['#C8102E', '#006BB6'],
  'golden state warriors': ['#1D428A', '#FFC72C'],
  'houston rockets': '#CE1141',
  'rockets': '#CE1141',
  'indiana pacers': ['#002D62', '#FDBB30'],
  'pacers': ['#002D62', '#FDBB30'],
  'los angeles clippers': ['#C8102E', '#1D428A'],
  'clippers': ['#C8102E', '#1D428A'],
  'los angeles lakers': ['#552583', '#FDB927'],
  'memphis grizzlies': '#5D76A9',
  'grizzlies': '#5D76A9',
  'miami heat': ['#98002E', '#F9A01B'],
  'heat': ['#98002E', '#F9A01B'],
  'milwaukee bucks': ['#00471B', '#EEE1C6'],
  'bucks': ['#00471B', '#EEE1C6'],
  'minnesota timberwolves': ['#0C2340', '#78BE20'],
  'timberwolves': ['#0C2340', '#78BE20'],
  't wolves': ['#0C2340', '#78BE20'],
  'new orleans pelicans': ['#0C2340', '#E8B84B'],
  'pelicans': ['#0C2340', '#E8B84B'],
  'new york knicks': ['#006BB6', '#F58426'],
  'knicks': ['#006BB6', '#F58426'],
  'oklahoma city thunder': '#007AC1',
  'thunder': '#007AC1',
  'orlando magic': '#0077C0',
  'magic': '#0077C0',
  'philadelphia 76ers': ['#006BB6', '#ED174C'],
  'phoenix suns': ['#E56020', '#1D1160'],
  'suns': ['#E56020', '#1D1160'],
  'portland trail blazers': ['#CE1141', '#1A1A1A'],
  'blazers': ['#CE1141', '#1A1A1A'],
  'sacramento kings': '#5A2D81',
  'kings': '#5A2D81',
  'san antonio spurs': ['#1A1A1A', '#C4CED4'],
  'spurs': ['#1A1A1A', '#C4CED4'],
  'toronto raptors': ['#CE1141', '#1A1A1A'],
  'raptors': ['#CE1141', '#1A1A1A'],
  'utah jazz': ['#002B5C', '#F9A01B'],
  'jazz': ['#002B5C', '#F9A01B'],
  'washington wizards': ['#002B5C', '#E31837'],
  'wizards': ['#002B5C', '#E31837'],
  // --- NFL ---
  'arizona cardinals': '#97233F',
  'cardinals': '#97233F',
  'atlanta falcons': ['#A7194B', '#1A1A1A'],
  'falcons': ['#A7194B', '#1A1A1A'],
  'baltimore ravens': ['#241773', '#9E7C0C'],
  'ravens': ['#241773', '#9E7C0C'],
  'buffalo bills': ['#00338D', '#C60C30'],
  'bills': ['#00338D', '#C60C30'],
  'carolina panthers': ['#0085CA', '#1A1A1A'],
  'panthers': ['#0085CA', '#1A1A1A'],
  'chicago bears': ['#0B162A', '#C83803'],
  'bears': ['#0B162A', '#C83803'],
  'cincinnati bengals': ['#FB4F14', '#1A1A1A'],
  'bengals': ['#FB4F14', '#1A1A1A'],
  'cleveland browns': ['#311D00', '#FF3C00'],
  'browns': ['#311D00', '#FF3C00'],
  'dallas cowboys': ['#003594', '#B0B7BC'],
  'cowboys': ['#003594', '#B0B7BC'],
  'denver broncos': ['#002244', '#FB4F14'],
  'broncos': ['#002244', '#FB4F14'],
  'detroit lions': '#0076B6',
  'lions': '#0076B6',
  'green bay packers': ['#203731', '#FFB612'],
  'packers': ['#203731', '#FFB612'],
  'houston texans': ['#03202F', '#A7194B'],
  'texans': ['#03202F', '#A7194B'],
  'indianapolis colts': '#002C5F',
  'colts': '#002C5F',
  'jacksonville jaguars': ['#00677F', '#D7A22A'],
  'jaguars': ['#00677F', '#D7A22A'],
  'kansas city chiefs': ['#E31837', '#FFB81C'],
  'chiefs': ['#E31837', '#FFB81C'],
  'las vegas raiders': ['#1A1A1A', '#C0C0C0'],
  'raiders': ['#1A1A1A', '#C0C0C0'],
  'los angeles chargers': ['#0080C6', '#FFC20E'],
  'chargers': ['#0080C6', '#FFC20E'],
  'los angeles rams': ['#003594', '#FFA300'],
  'rams': ['#003594', '#FFA300'],
  'miami dolphins': ['#008E97', '#FC4C02'],
  'dolphins': ['#008E97', '#FC4C02'],
  'minnesota vikings': '#4F2683',
  'vikings': '#4F2683',
  'new england patriots': ['#002244', '#C60C30'],
  'patriots': ['#002244', '#C60C30'],
  'new orleans saints': ['#1A1A1A', '#D3BC8D'],
  'saints': ['#1A1A1A', '#D3BC8D'],
  'new york giants': ['#0B2265', '#A7194B'],
  'giants': ['#0B2265', '#A7194B'],
  'new york jets': ['#125740', '#FFFFFF'],
  'jets': ['#125740', '#FFFFFF'],
  'philadelphia eagles': '#004C54',
  'eagles': '#004C54',
  'pittsburgh steelers': ['#1A1A1A', '#FFB612'],
  'steelers': ['#1A1A1A', '#FFB612'],
  'san francisco 49ers': ['#AA0000', '#B3995D'],
  '49ers': ['#AA0000', '#B3995D'],
  'seattle seahawks': ['#002244', '#69BE28'],
  'seahawks': ['#002244', '#69BE28'],
  'tampa bay buccaneers': ['#D50A0A', '#8A8D8F'],
  'buccaneers': ['#D50A0A', '#8A8D8F'],
  'tennessee titans': ['#0C2340', '#4B92DB'],
  'titans': ['#0C2340', '#4B92DB'],
  'washington commanders': '#5A1414',
  'commanders': '#5A1414',
  // --- Ghana Premier League ---
  'asante kotoko': '#E30613',
  'kotoko': '#E30613',
  'hearts of oak': '#1A56DB',
  'hearts': '#1A56DB',
  'accra hearts of oak': '#1A56DB',
  'great olympics': '#0057B8',
  'medeama': '#7C3AED',
  'dreams': '#9333EA',
  'dreams fc': '#9333EA',
  'aduana stars': '#FACC15',
  'aduana': '#FACC15',
  'ashanti gold': '#FACC15',
  'ashantigold': '#FACC15',
  'bechem united': '#2E9E5B',
  'bechem': '#2E9E5B',
  'nations': '#2E9E5B',
  'nations fc': '#2E9E5B',
  'samartex': '#00A651',
  'gold stars': '#FACC15',
  'bibiani gold stars': '#FACC15',
  'vision': '#0E7C7B',
  // --- Spain (lower divisions on the board) ---
  'malaga': ['#0A1E46', '#FFFFFF'],
  'espanyol': ['#0077C0', '#FFFFFF'],
  'rayo vallecano': ['#FFFFFF', '#E30613'],
  'rayo': ['#FFFFFF', '#E30613'],
  'alaves': ['#0060A9', '#FFFFFF'],
  'elche': ['#006F42', '#FFFFFF'],
  'racing santander': ['#0A7C3E', '#FFFFFF'],
  'levante': ['#E30613', '#004B8D'],
  'granada': ['#E30613', '#FFFFFF'],
  'leganes': ['#004B8D', '#FFFFFF'],
  'valladolid': ['#7A1E2B', '#FFFFFF'],
  'eibar': ['#A6194B', '#004B8D'],
  'tenerife': ['#FFFFFF', '#004B8D'],
  'burgos': '#C9CDD6',
  'ceuta': ['#FFFFFF', '#E30613'],
  'ad ceuta': ['#FFFFFF', '#E30613'],
  'castellon': '#C9CDD6',
  'cd castellon': '#C9CDD6',
  'sabadell': ['#004B8D', '#E30613'],
  'ce sabadell': ['#004B8D', '#E30613'],
  'cordoba': ['#00854A', '#FFFFFF'],
  'albacete': '#C9CDD6',
  'cadiz': ['#FFED00', '#004B8D'],
  'almeria': ['#EE2E24', '#FFFFFF'],
  'las palmas': ['#004B8D', '#FFED00'],
  'deportivo la coruna': ['#FFFFFF', '#004B8D'],
  'deportivo': ['#FFFFFF', '#004B8D'],
  'sporting gijon': ['#E30613', '#FFFFFF'],
  'andorra': ['#FFED00', '#E30613'],
  // --- Germany 2nd / cup sides ---
  'cologne': ['#ED0000', '#FFFFFF'],
  'mainz': ['#ED1C24', '#FFFFFF'],
  'union berlin': ['#E30613', '#FFCC00'],
  'st pauli': ['#5A3A1E', '#FFFFFF'],
  'freiburg': ['#E30613', '#FFFFFF'],
  'hoffenheim': ['#1C63B7', '#FFFFFF'],
  'heidenheim': ['#E30613', '#004B8D'],
  'augsburg': ['#0A7A3D', '#FFFFFF'],
  'werder bremen': ['#00854C', '#FFFFFF'],
  'werder': ['#00854C', '#FFFFFF'],
  'bochum': ['#004B8D', '#FFFFFF'],
  'hertha': ['#004B8D', '#FFFFFF'],
  'schalke': ['#004B8D', '#FFFFFF'],
  'hamburg': ['#0A1E46', '#FFFFFF'],
  'hannover': ['#E30613', '#1A1A1A'],
  'nuremberg': ['#9E1B32', '#1A1A1A'],
  'nurnberg': ['#9E1B32', '#1A1A1A'],
  'kaiserslautern': ['#E30613', '#FFFFFF'],
  'darmstadt': ['#004B8D', '#FFFFFF'],
  'paderborn': ['#004B8D', '#1A1A1A'],
  'karlsruher': ['#004B8D', '#FFFFFF'],
  'greuther furth': ['#FFFFFF', '#00854A'],
  'furth': ['#FFFFFF', '#00854A'],
  'elversberg': '#C9CDD6',
  'dynamo dresden': ['#FFCC00', '#1A1A1A'],
  'dresden': ['#FFCC00', '#1A1A1A'],
  'eintracht braunschweig': ['#004B8D', '#FFCC00'],
  'braunschweig': ['#004B8D', '#FFCC00'],
  'energie cottbus': ['#E30613', '#FFFFFF'],
  'cottbus': ['#E30613', '#FFFFFF'],
  'osnabruck': ['#5A2D82', '#FFFFFF'],
  'vfl 1899 osnabruck': ['#5A2D82', '#FFFFFF'],
  'magdeburg': ['#004B8D', '#FFFFFF'],
  'holstein kiel': ['#004B8D', '#E30613'],
  'arminia bielefeld': ['#004B8D', '#FFFFFF'],
  'arminia': ['#004B8D', '#FFFFFF'],
  // --- Netherlands ---
  'twente': ['#E30613', '#FFFFFF'],
  'utrecht': ['#E30613', '#FFFFFF'],
  'groningen': ['#00854C', '#FFFFFF'],
  'az alkmaar': ['#E30613', '#FFFFFF'],
  'alkmaar': ['#E30613', '#FFFFFF'],
  'heerenveen': ['#004B8D', '#FFFFFF'],
  'nec nijmegen': ['#E30613', '#00854C'],
  'nec': ['#E30613', '#00854C'],
  'sparta rotterdam': ['#E30613', '#FFFFFF'],
  'sparta': ['#E30613', '#FFFFFF'],
  'pec zwolle': ['#004B8D', '#FFFFFF'],
  'zwolle': ['#004B8D', '#FFFFFF'],
  'go ahead eagles': ['#E30613', '#FFCC00'],
  'fortuna sittard': ['#FFCC00', '#00854C'],
  'sittard': ['#FFCC00', '#00854C'],
  'willem ii': ['#E30613', '#004B8D'],
  'willem': ['#E30613', '#004B8D'],
  'telstar': ['#FFFFFF', '#E30613'],
  'sc telstar': ['#FFFFFF', '#E30613'],
  'cambuur': ['#FFCC00', '#004B8D'],
  'sc cambuur': ['#FFCC00', '#004B8D'],
  'ado den haag': ['#00854C', '#FFCC00'],
  'den haag': ['#00854C', '#FFCC00'],
  'excelsior': ['#E30613', '#1A1A1A'],
  // --- France ---
  'auxerre': ['#004B8D', '#FFFFFF'],
  'aj auxerre': ['#004B8D', '#FFFFFF'],
  'angers': '#C9CDD6',
  'brest': ['#E30613', '#FFFFFF'],
  'le havre': ['#004B8D', '#87CEEB'],
  'havre': ['#004B8D', '#87CEEB'],
  'lorient': ['#E37222', '#1A1A1A'],
  'nice': ['#E30613', '#1A1A1A'],
  'rennes': ['#E30613', '#1A1A1A'],
  'strasbourg': ['#004B8D', '#FFFFFF'],
  'toulouse': ['#5A2D82', '#FFFFFF'],
  'paris fc': ['#0A1E46', '#FFFFFF'],
  'troyes': ['#004B8D', '#FFFFFF'],
  'le mans': ['#E30613', '#FFCC00'],
  // --- Italy (lower) ---
  'como 1907': ['#004B8D', '#FFFFFF'],
  'como': ['#004B8D', '#FFFFFF'],
  'parma': ['#FFCC00', '#004B8D'],
  'cagliari': ['#E30613', '#004B8D'],
  'genoa': ['#E30613', '#004B8D'],
  'lecce': ['#E30613', '#FFCC00'],
  'monza': ['#E30613', '#FFFFFF'],
  'sassuolo': ['#00854C', '#1A1A1A'],
  'udinese': '#C9CDD6',
  'venezia': ['#00854C', '#E37222'],
  'frosinone': ['#FFCC00', '#004B8D'],
  // --- England (lower) ---
  'birmingham city': ['#004B8D', '#FFFFFF'],
  'birmingham': ['#004B8D', '#FFFFFF'],
  'blackburn rovers': ['#004B8D', '#FFFFFF'],
  'blackburn': ['#004B8D', '#FFFFFF'],
  'bolton wanderers': ['#FFFFFF', '#0A1E46'],
  'bolton': ['#FFFFFF', '#0A1E46'],
  'bristol city': ['#E30613', '#FFFFFF'],
  'bristol': ['#E30613', '#FFFFFF'],
  'cardiff city': ['#004B8D', '#FFFFFF'],
  'cardiff': ['#004B8D', '#FFFFFF'],
  'charlton athletic': ['#E30613', '#FFFFFF'],
  'charlton': ['#E30613', '#FFFFFF'],
  'coventry city': ['#87CEEB', '#FFFFFF'],
  'coventry': ['#87CEEB', '#FFFFFF'],
  'derby county': '#C9CDD6',
  'derby': '#C9CDD6',
  'hull city': ['#E37222', '#1A1A1A'],
  'hull': ['#E37222', '#1A1A1A'],
  'lincoln city': ['#E30613', '#FFFFFF'],
  'lincoln': ['#E30613', '#FFFFFF'],
  'middlesbrough': ['#E30613', '#FFFFFF'],
  'millwall': ['#004B8D', '#FFFFFF'],
  'norwich': ['#FFCC00', '#00854C'],
  'preston north end': ['#FFFFFF', '#0A1E46'],
  'preston': ['#FFFFFF', '#0A1E46'],
  'queens park rangers': ['#004B8D', '#FFFFFF'],
  'qpr': ['#004B8D', '#FFFFFF'],
  'sheffield united': ['#E30613', '#FFFFFF'],
  'sheffield': ['#E30613', '#FFFFFF'],
  'stoke': ['#E30613', '#FFFFFF'],
  'swansea': '#C9CDD6',
  'west bromwich': ['#0A1E46', '#FFFFFF'],
  'west brom': ['#0A1E46', '#FFFFFF'],
  'wrexham': ['#E30613', '#00854C'],
  'arbroath': ['#7A1E2B', '#FFFFFF'],
  'ayr united': '#C9CDD6',
  'ayr': '#C9CDD6',
  'greenock morton': ['#004B8D', '#FFFFFF'],
  'morton': ['#004B8D', '#FFFFFF'],
  'livingston': ['#E8B800', '#1A1A1A'],
  'partick thistle': ['#E30613', '#FFCC00'],
  'partick': ['#E30613', '#FFCC00'],
  'raith rovers': ['#0A1E46', '#FFFFFF'],
  'raith': ['#0A1E46', '#FFFFFF'],
  // --- Russia ---
  'cska moscow': ['#E30613', '#004B8D'],
  'cska': ['#E30613', '#004B8D'],
  'spartak moscow': ['#E30613', '#FFFFFF'],
  'spartak': ['#E30613', '#FFFFFF'],
  'zenit': ['#004B8D', '#FFFFFF'],
  'zenit saint petersburg': ['#004B8D', '#FFFFFF'],
  'lokomotiv moscow': ['#E30613', '#00854C'],
  'lokomotiv': ['#E30613', '#00854C'],
  'dinamo moscow': ['#004B8D', '#FFFFFF'],
  'dinamo': ['#004B8D', '#FFFFFF'],
  'krasnodar': ['#00854C', '#1A1A1A'],
  'fk krasnodar': ['#00854C', '#1A1A1A'],
  'rostov': ['#FFCC00', '#004B8D'],
  'fk rostov': ['#FFCC00', '#004B8D'],
  'rubin kazan': ['#E30613', '#00854C'],
  'rubin': ['#E30613', '#00854C'],
  'akhmat grozny': ['#00854C', '#FFFFFF'],
  'akhmat': ['#00854C', '#FFFFFF'],
  'krylia sovetov': ['#004B8D', '#FFFFFF'],
  'krylia': ['#004B8D', '#FFFFFF'],
  'orenburg': ['#004B8D', '#FFFFFF'],
  'fakel voronezh': ['#E30613', '#004B8D'],
  'fakel': ['#E30613', '#004B8D'],
  'baltika kaliningrad': ['#004B8D', '#FFFFFF'],
  'baltika': ['#004B8D', '#FFFFFF'],
  'dynamo makhachkala': ['#004B8D', '#FFFFFF'],
  'makhachkala': ['#004B8D', '#FFFFFF'],
  'akron tolyatti': ['#E30613', '#1A1A1A'],
  'akron': ['#E30613', '#1A1A1A'],
  'sabah': ['#FFFFFF', '#004B8D'],
  'rodina moscow': ['#004B8D', '#FFFFFF'],
  'rodina': ['#004B8D', '#FFFFFF'],
  'veres rivne': ['#E30613', '#1A1A1A'],
  'veres': ['#E30613', '#1A1A1A'],
  // --- Brazil ---
  'flamengo': ['#E30613', '#1A1A1A'],
  'palmeiras': ['#00854C', '#FFFFFF'],
  'corinthians': '#C9CDD6',
  'sao paulo': ['#FFFFFF', '#E30613'],
  'santos': '#C9CDD6',
  'gremio': ['#004B8D', '#1A1A1A'],
  'internacional': ['#E30613', '#FFFFFF'],
  'ec bahia': ['#004B8D', '#E30613'],
  'bahia': ['#004B8D', '#E30613'],
  'ec vitoria': ['#E30613', '#1A1A1A'],
  'vitoria': ['#E30613', '#1A1A1A'],
  'botafogo': '#C9CDD6',
  'vasco da gama': ['#FFFFFF', '#E30613'],
  'vasco': ['#FFFFFF', '#E30613'],
  'cruzeiro': ['#004B8D', '#FFFFFF'],
  'atletico mineiro': '#C9CDD6',
  'paranaense': ['#E30613', '#1A1A1A'],
  'red bull bragantino': ['#E30613', '#FFFFFF'],
  'bragantino': ['#E30613', '#FFFFFF'],
  'coritiba': ['#FFFFFF', '#00854C'],
  'clube do remo': ['#0A1E46', '#FFFFFF'],
  'remo': ['#0A1E46', '#FFFFFF'],
  'chapecoense': ['#00854C', '#FFFFFF'],
  'mirassol': ['#FFCC00', '#00854C'],
  'fluminense': ['#7A1E2B', '#00854C'],
  // --- Misc on the board ---
  'club brugge': ['#004B8D', '#1A1A1A'],
  'brugge': ['#004B8D', '#1A1A1A'],
  'galatasaray': '#E8641B',
  'slavia prague': ['#E30613', '#FFFFFF'],
  'slavia': ['#E30613', '#FFFFFF'],
  'viking fk': ['#0A1E46', '#FFFFFF'],
  'viking': ['#0A1E46', '#FFFFFF'],
  'england': '#E8EAED',
  'ireland': '#009444',
  'slovakia': '#0B4EA2',
};

// Vivid fallbacks for clubs not in the map — keeps unknown ties colourful.
const FALLBACK_VIVID = [
  '#F43F5E', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#38BDF8', '#818CF8', '#E879F9',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function hexToHsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh /= 6;
  }
  return [hh * 360, s, l];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(hex || '');
}

function normHex(hex) {
  let h = hex;
  if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
  return h.toUpperCase();
}

// Hue guard: dark crimsons / maroons (hue ~318–358°) read as pink once
// lifted for dark-mode text. Nudge them to true red so e.g. Bayern reads
// red, never pink.
function guardHue(h) {
  if (h >= 318 && h < 358) return 2;
  return h;
}

// Text/dot colour: lift to a readable lightness while keeping the hue
// family (with the crimson guard above).
export function toInk(hex) {
  if (!isValidHex(hex)) return '#38BDF8';
  const [hh, ss, ll] = hexToHsl(normHex(hex));
  if (ss < 0.12) {
    // Achromatic — keep whites white-ish, lift darks to slate.
    if (ll > 0.85) return '#EDF2F7';
    if (ll < 0.2) return '#9AA7BC';
    const l = Math.min(0.72, Math.max(0.6, ll));
    return hslToHex(hh, 0.08, l);
  }
  const h = guardHue(hh);
  const s = Math.min(Math.max(ss, 0.6), 0.92);
  const l = ll < 0.5 ? 0.58 : ll > 0.68 ? 0.62 : Math.max(ll, 0.56);
  return hslToHex(h, s, l);
}

// Bar fill stop: keep the AUTHENTIC tone, lifting only when so dark it
// would vanish on the dark track. Hue is never touched.
export function barStop(hex) {
  if (!isValidHex(hex)) return '#38BDF8';
  const [hh, ss, ll] = hexToHsl(normHex(hex));
  if (ss < 0.12) {
    // Blacks → dark slate (still reads "dark" next to the club colour).
    if (ll < 0.32) return hslToHex(hh, 0.1, 0.32);
    return normHex(hex);
  }
  if (ll < 0.3) return hslToHex(hh, ss, 0.34);
  return normHex(hex);
}

export function darken(hex, amt = 0.45) {
  try {
    const [h, s, l] = hexToHsl(normHex(hex));
    return hslToHex(h, Math.min(0.9, s), Math.max(0.16, l - amt));
  } catch {
    return '#0f172a';
  }
}

function asPair(v) {
  if (Array.isArray(v)) return [v[0], v[1] || null];
  return [v, null];
}

function lookupPair(normalized) {
  if (TEAM_COLORS[normalized]) return { pair: asPair(TEAM_COLORS[normalized]), known: true };
  // Partial match: longest known key contained in the name (or vice versa).
  let best = null;
  for (const k of Object.keys(TEAM_COLORS)) {
    if (k.length < 4) continue;
    if (normalized.includes(k) || k.includes(normalized)) {
      if (!best || k.length > best.length) best = k;
    }
  }
  if (best) return { pair: asPair(TEAM_COLORS[best]), known: true };
  return { pair: null, known: false };
}

function lightness(hex) {
  try {
    return hexToHsl(normHex(hex))[2];
  } catch {
    return 0.5;
  }
}

// Instant text colour — always returns a usable hex, no network.
export function teamInk(name = '') {
  const n = normalize(name);
  if (!n) return FALLBACK_VIVID[0];
  const key = ALIASES[n] || n;
  const { pair, known } = lookupPair(key);
  if (known && pair) {
    const [p, s] = pair;
    // Primary first: it IS the prominent colour. Fall back to secondary only
    // when the primary is near-black or near-white (unreadable as text).
    const lp = lightness(p);
    if (lp >= 0.1 && lp <= 0.88) return toInk(p);
    if (s) {
      const ls = lightness(s);
      if (ls >= 0.1 && ls <= 0.88) return toInk(s);
    }
    return '#CBD5E1';
  }
  return FALLBACK_VIVID[hash(n) % FALLBACK_VIVID.length];
}

// Back-compat: single team colour = the ink colour.
export function teamColor(name = '') {
  return teamInk(name);
}

// CSS background for bars: two-tone gradient when the club has a pair,
// authentic solid tone otherwise.
export function teamBar(name = '') {
  const n = normalize(name);
  if (!n) return FALLBACK_VIVID[0];
  const key = ALIASES[n] || n;
  const { pair, known } = lookupPair(key);
  if (known && pair) {
    const [p, s] = pair;
    if (s) return `linear-gradient(90deg, ${barStop(p)}, ${barStop(s)})`;
    return barStop(p);
  }
  return FALLBACK_VIVID[hash(n) % FALLBACK_VIVID.length];
}

// Gradient stops for the TeamCrest initials fallback tile.
export function teamGradient(name = '') {
  const n = normalize(name);
  if (!n) return [FALLBACK_VIVID[0], darken(FALLBACK_VIVID[0], 0.42)];
  const key = ALIASES[n] || n;
  const { pair, known } = lookupPair(key);
  if (known && pair) {
    const [p, s] = pair;
    if (s) return [barStop(p), barStop(s)];
    return [barStop(p), darken(barStop(p), 0.3)];
  }
  const c = FALLBACK_VIVID[hash(n) % FALLBACK_VIVID.length];
  return [c, darken(c, 0.42)];
}

export function isKnownTeam(name = '') {
  const n = normalize(name);
  if (!n) return false;
  return lookupPair(ALIASES[n] || n).known;
}

// --- cached (extracted) colours — only for clubs NOT in the map ---
// (Bumped key: v1 cached single colours that now lose to curated pairs.)

export const colorKey = (name = '') => `oddslens-color2-${String(name).toLowerCase()}`;

export function getCachedTeamColor(name = '') {
  try {
    const v = localStorage.getItem(colorKey(name));
    if (v && /^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  } catch { /* ignore */ }
  return null;
}

export function setCachedTeamColor(name = '', hex) {
  if (!name || !/^#[0-9A-Fa-f]{6}$/.test(hex || '')) return;
  try {
    localStorage.setItem(colorKey(name), hex);
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent('oddslens-teamcolor', { detail: { name, color: hex } }));
  } catch { /* ignore */ }
}

// Extract the dominant pixel colour from a badge URL (raw, unlifted —
// callers pass it through toInk()). Null when unreadable (CORS, white-only…).
export function extractDominantColor(srcUrl) {
  return new Promise((resolve) => {
    if (!srcUrl) return resolve(null);
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    const timer = setTimeout(() => finish(null), 6000);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const S = 48;
          const canvas = document.createElement('canvas');
          canvas.width = S;
          canvas.height = S;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            clearTimeout(timer);
            return finish(null);
          }
          ctx.drawImage(img, 0, 0, S, S);
          const data = ctx.getImageData(0, 0, S, S).data;
          const buckets = new Map();
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a < 128) continue;
            // Skip flat backgrounds (white / near-black) so we pick the
            // crest ink instead of the canvas it sits on.
            if (r > 242 && g > 242 && b > 242) continue;
            if (r < 14 && g < 14 && b < 14) continue;
            const mx = Math.max(r, g, b) / 255;
            const mn = Math.min(r, g, b) / 255;
            const sat = mx === 0 ? 0 : (mx - mn) / mx;
            if (sat < 0.18) continue; // ignore grays on first pass
            const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
            const w = 0.35 + sat;
            const cur = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
            cur.count += w;
            cur.r += r * w;
            cur.g += g * w;
            cur.b += b * w;
            buckets.set(key, cur);
          }
          clearTimeout(timer);
          if (!buckets.size) return finish(null);
          let top = null;
          for (const v of buckets.values()) {
            if (!top || v.count > top.count) top = v;
          }
          const r = Math.round(top.r / top.count);
          const g = Math.round(top.g / top.count);
          const b = Math.round(top.b / top.count);
          finish('#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase());
        } catch {
          clearTimeout(timer);
          finish(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      img.src = srcUrl;
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

function syncStyle(name) {
  if (isKnownTeam(name)) return { ink: teamInk(name), bar: teamBar(name) };
  const cached = getCachedTeamColor(name);
  if (cached) return { ink: cached, bar: cached };
  const fb = teamInk(name);
  return { ink: fb, bar: fb };
}

// Reactive team style: curated pair for known clubs; cached/extracted ink
// for the rest. Returns { ink, bar } — bar is a CSS background value.
export function useTeamStyle(name = '') {
  const [style, setStyle] = useState(() => syncStyle(name));
  useEffect(() => {
    setStyle(syncStyle(name));
    if (isKnownTeam(name)) return undefined;
    const onColor = (e) => {
      const d = e?.detail;
      if (d && typeof d.name === 'string' && d.name.toLowerCase() === String(name).toLowerCase() && d.color) {
        setStyle({ ink: d.color, bar: d.color });
      }
    };
    window.addEventListener('oddslens-teamcolor', onColor);
    return () => window.removeEventListener('oddslens-teamcolor', onColor);
  }, [name]);
  return style;
}

// Reactive single colour (ink) — back-compat wrapper.
export function useTeamColor(name = '') {
  return useTeamStyle(name).ink;
}
