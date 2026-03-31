// DOM-elementen ophalen die in het script worden gebruikt.
const startScreen = document.getElementById('startScreen');
const formScreen = document.getElementById('formScreen');
const successScreen = document.getElementById('successScreen');
const startButton = document.getElementById('startButton');
const form = document.getElementById('inschrijfForm');
const formError = document.getElementById('formError');
const summary = document.getElementById('summary');
const playersContainer = document.getElementById('playersContainer');
const addPlayerButton = document.getElementById('addPlayerButton');
const sportTypeSelect = document.getElementById('sportType');
const onderdeelSelect = document.getElementById('onderdeel');
const closedMessage = document.getElementById('closedMessage');

// Algemene state voor configuratie en formulierstatus.
let config = {};
let onderdelenPerSport = {};
let playerCount = 3;
let isSubmitting = false;

// Laadt de configuratie uit config.json en controleert verplichte velden.
async function laadConfig() {
    const response = await fetch('config.json?v=' + SITE_VERSION);
    if (!response.ok) {
        throw new Error('config.json kon niet worden geladen');
    }

    config = await response.json();

    if (!config.titel) {
        throw new Error('titel ontbreekt in config.json');
    }

    if (!config.sluitingsdatums) {
        throw new Error('sluitingsdatums ontbreken in config.json');
    }

    if (!config.sheetUrl) {
        throw new Error('sheetUrl ontbreekt in config.json');
    }

    if (!config.onderdelen) {
        throw new Error('onderdelen ontbreken in config.json');
    }

    onderdelenPerSport = config.onderdelen;
}

// Initialiseert de pagina met configuratie, sporten en sluitingscontrole.
async function init() {
    try {
        await laadConfig();
        pasConfigToeOpPagina();
        vulSporten();
        controleerOfAllesGeslotenIs();
    } catch (error) {
        console.error(error);
        alert('Er ging iets mis bij het laden van de configuratie.');
    }
}

// Formatteert een ISO-datum naar een Nederlandse leesbare datum.
function formatteerDatum(isoDatum) {
    const datum = new Date(isoDatum);
    return datum.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Past configuratiegegevens zoals titel, clubnaam en contactgegevens toe op de pagina.
function pasConfigToeOpPagina() {
    document.title = config.titel;

    document.querySelectorAll('.paginaTitel').forEach(el => {
        el.textContent = config.titel;
    });

    document.querySelectorAll('.clubNaam').forEach(el => {
        el.textContent = config.clubNaam;
    });

    document.querySelectorAll('.contactEmail').forEach(el => {
        el.textContent = config.contactEmail;
    });

    const deadlineElement = document.getElementById('inschrijfDeadlineTekst');

    if (deadlineElement) {
        if (!config.sluitingsdatums) {
            deadlineElement.textContent = '';
            return;
        }

        const vandaag = new Date();

        const deadlines = Object.entries(config.sluitingsdatums).map(([sport, datum]) => {
            const sluitDatum = new Date(datum);

            if (sluitDatum < vandaag.setHours(0, 0, 0, 0)) {
                return `Inschrijving voor ${sport} is gesloten.`;
            } else {
                return `Inschrijving voor ${sport} is mogelijk t/m ${formatteerDatum(datum)}.`;
            }
        });

        deadlineElement.innerHTML = deadlines.join('<br>');
    }
}

// Controleert of alle sporten gesloten zijn en toont dan een algemene melding.
function controleerOfAllesGeslotenIs() {
    const sporten = Object.keys(config.onderdelen);
    const allesGesloten = sporten.every((sport) => isSportGesloten(sport));

    if (allesGesloten) {
        startButton.style.display = 'none';
        formScreen.classList.remove('active');
        closedMessage.style.display = 'block';
        closedMessage.innerHTML = `
            <strong>Inschrijving gesloten</strong><br>
            De inschrijving voor alle sporten is gesloten.
            Voor vragen kun je mailen naar <span class="contactEmail">${config.contactEmail}</span>.
        `;
    }
}

// Controleert of de sluitingsdatum van een sport is verstreken.
function isSportGesloten(sport) {
    if (!sport || !config.sluitingsdatums || !config.sluitingsdatums[sport]) {
        return false;
    }

    const sluitingsDatum = new Date(config.sluitingsdatums[sport]);
    sluitingsDatum.setHours(23, 59, 59, 999);

    const nu = new Date();
    return nu > sluitingsDatum;
}

// Vult de keuzelijst met sporten op basis van de configuratie.
function vulSporten() {
    sportTypeSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Maak een keuze';
    sportTypeSelect.appendChild(defaultOption);

    Object.keys(config.onderdelen).forEach((sport) => {
        const option = document.createElement('option');
        option.value = sport;

        if (isSportGesloten(sport)) {
            option.textContent = `${sport} (gesloten)`;
            option.disabled = true;
        } else {
            option.textContent = sport;
        }

        sportTypeSelect.appendChild(option);
    });
}

// Vult de onderdelen op basis van de gekozen sport.
function vulOnderdelen() {
    const gekozenSport = sportTypeSelect.value;
    const opties = onderdelenPerSport[gekozenSport] || [];

    onderdeelSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = gekozenSport ? 'Maak een keuze' : 'Kies eerst Tennis of Padel';
    onderdeelSelect.appendChild(defaultOption);

    opties.forEach((onderdeel) => {
        const option = document.createElement('option');
        option.value = onderdeel;
        option.textContent = onderdeel;
        onderdeelSelect.appendChild(option);
    });

    onderdeelSelect.disabled = opties.length === 0;
    onderdeelSelect.value = '';

    updateDeadlineTekst(gekozenSport);
}

// Toont een melding dat inschrijving voor een specifieke sport gesloten is.
function toonGeslotenMelding(sport) {
    const datum = config.sluitingsdatums[sport];
    closedMessage.style.display = 'block';
    closedMessage.innerHTML = `
        <strong>Inschrijving gesloten</strong><br>
        De inschrijving voor <strong>${sport}</strong> is gesloten sinds
        ${formatteerDatum(datum)}.
        Voor vragen kun je mailen naar <span class="contactEmail">${config.contactEmail}</span>.
    `;
}

// Verbergt de melding dat een sport of inschrijving gesloten is.
function verbergGeslotenMelding() {
    closedMessage.style.display = 'none';
}

// Toont de juiste sluitingsdatum voor de gekozen sport.
function updateDeadlineTekst(sport) {
    const deadlineElement = document.getElementById('inschrijfDeadlineTekst');
    if (!deadlineElement) return;

    if (!sport || !config.sluitingsdatums[sport]) {
        deadlineElement.textContent = 'Kies een sport om de sluitingsdatum te zien.';
        return;
    }

    deadlineElement.textContent =
        `${sport}: inschrijven kan t/m ${formatteerDatum(config.sluitingsdatums[sport])}.`;
}

// Maakt een verwijderknop voor een extra spelerregel.
function createRemoveButton(row) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'remove-player';
    button.textContent = 'Verwijderen';
    button.addEventListener('click', () => {
        row.remove();
    });
    return button;
}

// Controleert of een e-mailadres een geldig formaat heeft.
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Controleert of een IBAN technisch geldig is op basis van de IBAN-check.
function isValidIBAN(iban) {
    iban = iban.replace(/\s+/g, '').toUpperCase();

    if (!/^[A-Z0-9]+$/.test(iban)) return false;
    if (iban.length < 15 || iban.length > 34) return false;

    iban = iban.slice(4) + iban.slice(0, 4);

    iban = iban.replace(/[A-Z]/g, function (char) {
        return char.charCodeAt(0) - 55;
    });

    let remainder = iban;
    while (remainder.length > 2) {
        let block = remainder.slice(0, 9);
        remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
    }

    return parseInt(remainder, 10) % 97 === 1;
}

// Scrollt de pagina vloeiend naar het veld of element met een fout.
function scrollNaarFout(element) {
    const yOffset = -120;
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
}

// Zet de submitstatus terug naar normaal na een fout of succesvolle verwerking.
function resetSubmitStatus() {
    isSubmitting = false;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Verstuur inschrijving';
    }
}

// Zet de submitknop tijdelijk vast tijdens het verzenden.
function setSubmitStatusVerzenden() {
    isSubmitting = true;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Bezig met verzenden...';
    }
}

// Toont een foutmelding en scrollt naar het relevante foutpunt.
function toonFout(melding, elementVoorScroll = formError) {
    formError.textContent = melding;
    resetSubmitStatus();
    scrollNaarFout(elementVoorScroll);
}

// Opent het formulier vanuit het startscherm.
startButton.addEventListener('click', () => {
    startScreen.classList.remove('active');
    formScreen.classList.add('active');
});

// Werkt de onderdelenlijst bij zodra een sport wordt gekozen.
sportTypeSelect.addEventListener('change', vulOnderdelen);

// Voegt een extra spelerregel toe aan het formulier.
addPlayerButton.addEventListener('click', () => {
    playerCount += 1;

    const row = document.createElement('div');
    row.className = 'player-row';
    row.setAttribute('data-player-row', '');
    row.innerHTML = `
        <div class="field">
            <label for="player${playerCount}">Speler ${playerCount}</label>
            <input type="text" id="player${playerCount}" name="player${playerCount}"/>
        </div>
    `;

    row.appendChild(createRemoveButton(row));
    playersContainer.appendChild(row);
});

// Verwerkt de formulierinzending inclusief validatie en verzending.
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    setSubmitStatusVerzenden();
    formError.textContent = '';

    const captainName = document.getElementById('captainName').value.trim();
    const captainEmail = document.getElementById('captainEmail').value.trim();
    const iban = document.getElementById('iban').value.replace(/\s+/g, '').toUpperCase();
    const ibanName = document.getElementById('ibanName').value.trim();
    const sportType = sportTypeSelect.value.trim();
    const onderdeel = onderdeelSelect.value.trim();

    const playerInputs = playersContainer.querySelectorAll('input');
    const players = Array.from(playerInputs)
        .map((input) => input.value.trim())
        .filter(Boolean);

    const agreeRules = document.getElementById('agreeRules').checked;
    const agreePayment = document.getElementById('agreePayment').checked;
    const captainEmailField = document.getElementById('captainEmail');
    const ibanField = document.getElementById('iban');

    captainEmailField.style.border = '';
    ibanField.style.border = '';

    if (!captainName) {
        toonFout('Vul de naam van de captain in.');
        return;
    }

    if (!captainEmail) {
        toonFout('Vul het e-mailadres van de captain in.');
        return;
    }

    if (!isValidEmail(captainEmail)) {
        captainEmailField.style.border = '2px solid red';
        toonFout('Vul een geldig e-mailadres in.', captainEmailField);
        return;
    }

    if (!iban) {
        toonFout('Vul het IBAN nummer in.', ibanField);
        return;
    }

    if (!isValidIBAN(iban)) {
        ibanField.style.border = '2px solid red';
        toonFout('Het IBAN nummer lijkt niet te kloppen.', ibanField);
        return;
    }

    if (!iban.startsWith('NL')) {
        ibanField.style.border = '2px solid red';
        toonFout('Alleen Nederlandse IBAN nummers zijn toegestaan.', ibanField);
        return;
    }

    if (iban.length !== 18) {
        ibanField.style.border = '2px solid red';
        toonFout('Een Nederlands IBAN nummer moet 18 tekens hebben.', ibanField);
        return;
    }

    if (!ibanName) {
        toonFout('Vul de tenaamstelling van de bankrekening in.');
        return;
    }

    if (!sportType) {
        toonFout('Kies eerst Tennis of Padel.');
        return;
    }

    if (isSportGesloten(sportType)) {
        toonFout(`De inschrijving voor ${sportType} is gesloten.`);
        return;
    }

    if (!onderdeel) {
        toonFout('Kies daarna een onderdeel.');
        return;
    }

    if (players.length < 3) {
        toonFout('Voer minimaal 3 spelers in.');
        return;
    }

    if (!agreeRules) {
        toonFout('Je moet akkoord gaan met de reglementen.');
        return;
    }

    if (!agreePayment) {
        toonFout('Je moet akkoord gaan met de betalingsvoorwaarde.');
        return;
    }

    const data = {
        captainName: captainName,
        email: captainEmail,
        iban: iban,
        ibanName: ibanName,
        sportType: sportType,
        onderdeel: onderdeel,
        players: players.join(', ')
    };

    try {
        const response = await fetch(config.sheetUrl, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });

        if (!response.ok) {
            throw new Error('Verzenden mislukt');
        }

        summary.innerHTML = `
            <p><strong>Captain:</strong> ${captainName}</p>
            <p><strong>E-mail:</strong> ${captainEmail}</p>
            <p><strong>IBAN:</strong> ${iban}</p>
            <p><strong>Tenaamstelling:</strong> ${ibanName}</p>
            <p><strong>Sport:</strong> ${sportType}</p>
            <p><strong>Onderdeel:</strong> ${onderdeel}</p>
            <p><strong>Spelers:</strong> ${players.join(', ')}</p>
            <p><strong>Reglementen akkoord:</strong> Ja</p>
            <p><strong>Betaling akkoord:</strong> Ja</p>
        `;

        formScreen.classList.remove('active');
        successScreen.classList.add('active');
        form.reset();
        sportTypeSelect.value = '';
        onderdeelSelect.innerHTML = '<option value="">Kies eerst Tennis of Padel</option>';
        onderdeelSelect.disabled = true;
        verbergGeslotenMelding();
        updateDeadlineTekst('');
    } catch (error) {
        formError.textContent = 'Er ging iets mis bij het verzenden.';
        console.error(error);
        resetSubmitStatus();
        scrollNaarFout(formError);
        return;
    }

    resetSubmitStatus();
});

// Start de initialisatie van de pagina zodra het script geladen is.
init();