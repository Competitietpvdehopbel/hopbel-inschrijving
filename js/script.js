
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


let config = {};
let onderdelenPerSport = {};
let playerCount = 3;

async function laadConfig() {
    const response = await fetch('config.json');
    if (!response.ok) {
        throw new Error('config.json kon niet worden geladen');
    }

    config = await response.json();

    if (!config.titel) {
        throw new Error('titel ontbreekt in config.json');
    }

    if (!config.sluitingsdatum) {
        throw new Error('sluitingsdatum ontbreekt in config.json');
    }

    if (!config.sheetUrl) {
        throw new Error('sheetUrl ontbreekt in config.json');
    }

    if (!config.onderdelen) {
        throw new Error('onderdelen ontbreken in config.json');
    }

    onderdelenPerSport = config.onderdelen;
}
async function init() {
    try {
        await laadConfig();
        pasConfigToeOpPagina();
        controleerSluitingsdatum();
    } catch (error) {
        console.error(error);
        alert('Er ging iets mis bij het laden van de configuratie.');
    }
}

function formatteerDatum(isoDatum) {
    const datum = new Date(isoDatum);
    return datum.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

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
        deadlineElement.textContent =
            'Inschrijven kan t/m ' + formatteerDatum(config.sluitingsdatum) + '.';
    }
}

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
function isValidIBAN(iban) {
    iban = iban.replace(/\s+/g, '').toUpperCase();

    if (!/^[A-Z0-9]+$/.test(iban)) return false;
    if (iban.length < 15 || iban.length > 34) return false;

    // Zet eerste 4 tekens achteraan
    iban = iban.slice(4) + iban.slice(0, 4);

    // Letters omzetten naar cijfers
    iban = iban.replace(/[A-Z]/g, function (char) {
        return char.charCodeAt(0) - 55;
    });

    // Mod 97 check
    let remainder = iban;
    while (remainder.length > 2) {
        let block = remainder.slice(0, 9);
        remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
    }

    return parseInt(remainder, 10) % 97 === 1;
}
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
}

startButton.addEventListener('click', () => {
    startScreen.classList.remove('active');
    formScreen.classList.add('active');
});

sportTypeSelect.addEventListener('change', vulOnderdelen);

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

form.addEventListener('submit', async (event) => {
    event.preventDefault();
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

    if (!captainName) {
        formError.textContent = 'Vul de naam van de captain in.';
        return;
    }

    if (!captainEmail) {
        formError.textContent = 'Vul het e-mailadres van de captain in.';
        return;
    }

    if (!iban) {
        formError.textContent = 'Vul het IBAN nummer in.';
        return;
    }

    if (!isValidIBAN(iban)) {
        formError.textContent = 'Het IBAN nummer lijkt niet te kloppen.';
        return;
    }

    if (!iban.startsWith('NL')) {
        formError.textContent = 'Alleen Nederlandse IBAN nummers zijn toegestaan.';
        return;
    }

    if (iban.length !== 18) {
        formError.textContent = 'Een Nederlands IBAN nummer moet 18 tekens hebben.';
        return;
    }
    if (!ibanName) {
        formError.textContent = 'Vul de tenaamstelling van de bankrekening in.';
        return;
    }

    if (!sportType) {
        formError.textContent = 'Kies eerst Tennis of Padel.';
        return;
    }

    if (!onderdeel) {
        formError.textContent = 'Kies daarna een onderdeel.';
        return;
    }

    if (players.length < 3) {
        formError.textContent = 'Voer minimaal 3 spelers in.';
        return;
    }

    if (!agreeRules) {
        formError.textContent = 'Je moet akkoord gaan met de reglementen.';
        return;
    }

    if (!agreePayment) {
        formError.textContent = 'Je moet akkoord gaan met de betalingsvoorwaarde.';
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
    } catch (error) {
        formError.textContent = 'Er ging iets mis bij het verzenden.';
        console.error(error);
    }
});

function controleerSluitingsdatum() {
    const sluitingsDatum = new Date(config.sluitingsdatum);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);

    if (vandaag > sluitingsDatum) {
        document.getElementById('closedMessage').style.display = 'block';
        startScreen.style.display = 'none';
        formScreen.style.display = 'none';
    }
}
init();