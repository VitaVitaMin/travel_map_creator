// Пропишите здесь ваши параметры GitHub
const GITHUB_TOKEN = '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'; // Замените на ваш PAT, например: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const GITHUB_OWNER = 'VitaVitaMin'; // Замените на владельца репозитория, например: 'john-doe'
const GITHUB_REPO = 'travel_map_creator'; // Замените на название репозитория, например: 'travel-stories'
const GITHUB_PATH = 'data.json'; // Путь к файлу в репозитории, например: 'data.json' или 'path/to/data.json'

let data = { people: [] }; // Данные загружаются с GitHub при старте
let cityCount = 1;
let markers = [];
let polylines = [];
let currentPage = 1;
const pageSize = 5;
let editingId = null;
let cityCache = {};
const translations = {
  ru: {
    title: 'Истории путешествий',
    filterPlaceholder: 'Фильтр по имени',
    sortNameAsc: 'По имени (А-Я)',
    sortNameDesc: 'По имени (Я-А)',
    sortCitiesAsc: 'По количеству городов (возр.)',
    sortCitiesDesc: 'По количеству городов (убыв.)',
    createButton: 'Создать',
    importButton: 'Импорт',
    exportCsvButton: 'Экспорт CSV',
    selectPerson: 'Выберите человека',
    addTitle: 'Добавить историю',
    nameTooltip: 'Введите ФИО (три слова с заглавной буквы)',
    namePlaceholder: 'Иванов Иван Иванович',
    heroNameTooltip: 'Введите имя героя (минимум одно слово с заглавной буквы)',
    heroNamePlaceholder: 'Александр Великий',
    phoneTooltip: 'Введите номер телефона (10 цифр или +7)',
    phonePlaceholder: '+71234567890',
    cityLabel: 'Город',
    cityPlaceholder: 'Введите город',
    descLabel: 'Описание',
    descPlaceholder: 'Что пережил герой в этом городе?',
    addCityButton: 'Добавить город',
    saveButton: 'Сохранить',
    cancelButton: 'Отмена',
    deleteButton: 'Удалить',
    pathLabelPrefix: 'Путь:'
  },
  en: {
    title: 'Travel Stories',
    filterPlaceholder: 'Filter by name',
    sortNameAsc: 'By name (A-Z)',
    sortNameDesc: 'By name (Z-A)',
    sortCitiesAsc: 'By city count (asc)',
    sortCitiesDesc: 'By city count (desc)',
    createButton: 'Create',
    importButton: 'Import',
    exportCsvButton: 'Export CSV',
    selectPerson: 'Select a person',
    addTitle: 'Add Story',
    nameTooltip: 'Enter full name (three capitalized words)',
    namePlaceholder: 'John Doe Smith',
    heroNameTooltip: 'Enter hero name (at least one capitalized word)',
    heroNamePlaceholder: 'Alexander the Great',
    phoneTooltip: 'Enter phone number (10 digits or +7)',
    phonePlaceholder: '+71234567890',
    cityLabel: 'City',
    cityPlaceholder: 'Enter city',
    descLabel: 'Description',
    descPlaceholder: 'What did the hero experience in this city?',
    addCityButton: 'Add city',
    saveButton: 'Save',
    cancelButton: 'Cancel',
    deleteButton: 'Delete',
    pathLabelPrefix: 'Path:'
  }
};

// Инициализация карты
const map = L.map('map', {
  zoomControl: true,
  doubleClickZoom: false,
  touchZoom: true,
  scrollWheelZoom: false
}).setView([55.7558, 37.6173], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Загрузка данных с GitHub при старте
async function loadDataFromGitHub() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const content = atob(response.data.content);
    data = JSON.parse(content);
    populatePeopleSelect();
  } catch (error) {
    console.error('Ошибка загрузки данных с GitHub:', error);
    if (error.response?.status === 404) {
      data = { people: [] }; // Если файла нет, создаем пустой объект
    } else {
      alert('Ошибка загрузки данных с GitHub. Проверьте токен и параметры репозитория.');
    }
    populatePeopleSelect();
  }
}
loadDataFromGitHub();

// Локализация
let currentLang = 'ru';
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = translations[currentLang][el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = translations[currentLang][el.dataset.i18nPlaceholder];
  });
  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    el.dataset.tooltip = translations[currentLang][el.dataset.i18nTooltip];
  });
}
applyTranslations();
document.getElementById('language-toggle').value = currentLang;
document.getElementById('language-toggle').addEventListener('change', (e) => {
  currentLang = e.target.value;
  applyTranslations();
  populatePeopleSelect();
});

// Заполнение списка людей
const select = document.getElementById('person-select');
function populatePeopleSelect() {
  const filter = document.getElementById('filter-input').value.toLowerCase();
  const sort = document.getElementById('sort-select').value;
  let people = [...data.people].filter(p => p.name.toLowerCase().includes(filter));

  if (sort === 'name-asc') people.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'name-desc') people.sort((a, b) => b.name.localeCompare(b.name));
  else if (sort === 'cities-asc') people.sort((a, b) => a.cities.length - b.cities.length);
  else if (sort === 'cities-desc') people.sort((a, b) => b.cities.length - a.cities.length);

  const start = (currentPage - 1) * pageSize;
  const paginatedPeople = people.slice(start, start + pageSize);

  select.innerHTML = `<option value="" data-i18n="selectPerson">${translations[currentLang].selectPerson}</option>`;
  paginatedPeople.forEach(person => {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = person.name;
    select.appendChild(option);
  });

  updatePagination(people.length);
}
populatePeopleSelect();

function updatePagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.className = i === currentPage ? 'active' : '';
    button.addEventListener('click', () => {
      currentPage = i;
      populatePeopleSelect();
    });
    pagination.appendChild(button);
  }
}

// Фильтрация и сортировка
document.getElementById('filter-input').addEventListener('input', () => {
  currentPage = 1;
  populatePeopleSelect();
});
document.getElementById('sort-select').addEventListener('change', () => {
  currentPage = 1;
  populatePeopleSelect();
});

// Отображение маршрута и деталей
select.addEventListener('change', () => {
  const id = parseInt(select.value);
  const person = data.people.find(p => p.id === id);
  const details = document.getElementById('person-details');
  details.innerHTML = '';
  if (person) {
    showPersonRoute(person);
    details.innerHTML = `
      <h3>${translations[currentLang].pathLabelPrefix} ${person.heroName || person.name} (${person.name})</h3>
      <p>${translations[currentLang].phoneLabel}: ${person.phone}</p>
      <button class="edit-button" data-id="${person.id}"><i class="fas fa-edit"></i> ${translations[currentLang].addTitle}</button>
      <ul>
        ${person.cities.map(city => `<li><strong>${city.name}</strong>: ${city.description || translations[currentLang].descPlaceholder}</li>`).join('')}
      </ul>
      <button class="share-button" data-id="${person.id}"><i class="fas fa-share"></i> Поделиться</button>
    `;
    document.querySelectorAll('.edit-button').forEach(btn => {
      btn.addEventListener('click', () => editPerson(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.share-button').forEach(btn => {
      btn.addEventListener('click', () => sharePerson(parseInt(btn.dataset.id)));
    });
  }
});

function showPersonRoute(person) {
  markers.forEach(marker => map.removeLayer(marker));
  polylines.forEach(polyline => map.removeLayer(polyline));
  markers = [];
  polylines = [];

  const latlngs = person.cities.map(city => [city.lat, city.lon]).filter(c => c[0] && c[1]);
  latlngs.forEach((coord, index) => {
    const city = person.cities[index];
    const marker = L.marker(coord, {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-circle">${index + 1}</div>`
      })
    })
      .bindPopup(`<b>${city.name}</b><br>${city.description || translations[currentLang].descPlaceholder}`, {
        maxWidth: 300,
        className: 'custom-popup'
      })
      .addTo(map);
    markers.push(marker);
  });

  for (let i = 0; i < latlngs.length - 1; i++) {
    const segment = [latlngs[i], latlngs[i + 1]];
    const polyline = L.polyline(segment, { color: 'red' })
      .arrowheads({ size: '15px', frequency: 'endonly' })
      .addTo(map);
    polylines.push(polyline);
  }

  if (latlngs.length > 1) {
    map.fitBounds(latlngs);
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 10);
  }
}

// Поиск городов
async function searchCities(query, index) {
  if (!query || query.length < 3) {
    document.getElementById(`city-suggestions-${index}`).innerHTML = '';
    return;
  }

  if (cityCache[query]) {
    displaySuggestions(cityCache[query], index);
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&featuretype=city`;
  try {
    const response = await fetch(url);
    const results = await response.json();
    cityCache[query] = results;
    displaySuggestions(results, index);
  } catch (error) {
    console.error('Ошибка поиска:', error);
  }
}

function displaySuggestions(results, index) {
  const suggestions = document.getElementById(`city-suggestions-${index}`);
  suggestions.innerHTML = '';
  results.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city.display_name;
    li.addEventListener('click', () => {
      const input = document.getElementById(`city-input-${index}`);
      input.value = city.display_name;
      input.dataset.lat = city.lat;
      input.dataset.lon = city.lon;
      input.classList.remove('error');
      suggestions.innerHTML = '';
    });
    suggestions.appendChild(li);
  });
}

// Дебouncing для поиска
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Инициализация первого поля поиска
document.getElementById('city-input-0').addEventListener('input', debounce(e => searchCities(e.target.value, 0), 300));
document.getElementById('city-input-0').addEventListener('focus', () => {
  document.getElementById(`city-suggestions-0`).innerHTML = '';
});

// Добавление нового города
document.getElementById('add-city-button').addEventListener('click', () => {
  const container = document.getElementById('cities-container');
  const div = document.createElement('div');
  div.className = 'city-entry';
  div.innerHTML = `
    <label for="city-input-${cityCount}">${translations[currentLang].cityLabel} ${cityCount + 1}:</label>
    <input type="text" id="city-input-${cityCount}" class="city-input" placeholder="${translations[currentLang].cityPlaceholder}">
    <ul id="city-suggestions-${cityCount}" class="suggestions"></ul>
    <label for="city-desc-${cityCount}">${translations[currentLang].descLabel}:</label>
    <textarea id="city-desc-${cityCount}" class="city-desc" placeholder="${translations[currentLang].descPlaceholder}"></textarea>
  `;
  container.appendChild(div);

  // Привязка обработчиков для нового поля
  const newInput = document.getElementById(`city-input-${cityCount}`);
  newInput.addEventListener('input', debounce(e => searchCities(e.target.value, cityCount), 300));
  newInput.addEventListener('focus', () => {
    document.getElementById(`city-suggestions-${cityCount}`).innerHTML = '';
  });

  cityCount++;
});

// Открытие панели
document.getElementById('create-button').addEventListener('click', () => {
  editingId = null;
  document.getElementById('delete-button').classList.add('hidden');
  document.getElementById('add-panel').classList.remove('panel-hidden');
});

// Закрытие панели
document.getElementById('close-panel').addEventListener('click', () => {
  document.getElementById('add-panel').classList.add('panel-hidden');
  clearForm();
});

document.getElementById('cancel-button').addEventListener('click', () => {
  document.getElementById('add-panel').classList.add('panel-hidden');
  clearForm();
});

// GitHub API сохранение
async function saveToGitHub(data) {
  try {
    // Получаем текущий SHA файла (если он существует)
    let sha = null;
    try {
      const response = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
      sha = response.data.sha;
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }

    // Обновляем или создаем файл
    await axios.put(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      message: `Update ${GITHUB_PATH} via Travel Stories app`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      sha: sha
    }, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    return true;
  } catch (error) {
    console.error('Ошибка сохранения на GitHub:', error);
    alert('Ошибка сохранения на GitHub. Проверьте токен и параметры репозитория.');
    return false;
  }
}

// Сохранение
document.getElementById('save-button').addEventListener('click', async () => {
  const nameInput = document.getElementById('name-input');
  const heroNameInput = document.getElementById('hero-name-input');
  const phoneInput = document.getElementById('phone-input');
  const name = nameInput.value.trim();
  const heroName = heroNameInput.value.trim();
  const phone = phoneInput.value.trim();
  const cities = [];
  let hasError = false;

  for (let i = 0; i < cityCount; i++) {
    const input = document.getElementById(`city-input-${i}`);
    const desc = document.getElementById(`city-desc-${i}`);
    if (input && input.value && input.dataset.lat && input.dataset.lon) {
      cities.push({
        name: input.value,
        lat: parseFloat(input.dataset.lat),
        lon: parseFloat(input.dataset.lon),
        description: desc ? desc.value.trim() : ''
      });
    } else if (input && input.value) {
      input.classList.add('error');
      hasError = true;
    }
  }

  // Валидация
  if (!validateName(name)) {
    nameInput.classList.add('error');
    alert(translations[currentLang].nameTooltip);
    return;
  }
  nameInput.classList.remove('error');

  if (!validateHeroName(heroName)) {
    heroNameInput.classList.add('error');
    alert(translations[currentLang].heroNameTooltip);
    return;
  }
  heroNameInput.classList.remove('error');

  if (!validatePhone(phone)) {
    phoneInput.classList.add('error');
    alert(translations[currentLang].phoneTooltip);
    return;
  }
  phoneInput.classList.remove('error');

  if (cities.length === 0) {
    alert('Добавьте хотя бы один город.');
    return;
  }

  if (hasError) {
    alert('Некоторые города некорректны. Выберите города из списка.');
    return;
  }

  const cityNames = cities.map(c => c.name);
  if (new Set(cityNames).size !== cityNames.length) {
    alert('Города не должны повторяться.');
    return;
  }

  // Сохранение
  if (editingId) {
    const person = data.people.find(p => p.id === editingId);
    person.name = name;
    person.heroName = heroName;
    person.phone = phone;
    person.cities = cities;
  } else {
    const newId = data.people.length ? Math.max(...data.people.map(p => p.id)) + 1 : 1;
    data.people.push({ id: newId, name, heroName, phone, cities });
  }

  const githubSuccess = await saveToGitHub(data);
  if (githubSuccess) {
    // Локальное скачивание
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);

    populatePeopleSelect();
    clearForm();
    document.getElementById('add-panel').classList.add('panel-hidden');
  }
});

// Редактирование
function editPerson(id) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;

  editingId = id;
  document.getElementById('name-input').value = person.name;
  document.getElementById('hero-name-input').value = person.heroName || '';
  document.getElementById('phone-input').value = person.phone;
  const container = document.getElementById('cities-container');
  container.innerHTML = '';
  cityCount = person.cities.length;

  person.cities.forEach((city, index) => {
    const div = document.createElement('div');
    div.className = 'city-entry';
    div.innerHTML = `
      <label for="city-input-${index}">${translations[currentLang].cityLabel} ${index + 1}:</label>
      <input type="text" id="city-input-${index}" class="city-input" placeholder="${translations[currentLang].cityPlaceholder}" value="${city.name}">
      <ul id="city-suggestions-${index}" class="suggestions"></ul>
      <label for="city-desc-${index}">${translations[currentLang].descLabel}:</label>
      <textarea id="city-desc-${index}" class="city-desc" placeholder="${translations[currentLang].descPlaceholder}">${city.description || ''}</textarea>
    `;
    container.appendChild(div);
    const input = document.getElementById(`city-input-${index}`);
    input.dataset.lat = city.lat;
    input.dataset.lon = city.lon;
    input.addEventListener('input', debounce(e => searchCities(e.target.value, index), 300));
    input.addEventListener('focus', () => {
      document.getElementById(`city-suggestions-${index}`).innerHTML = '';
    });
  });

  document.getElementById('delete-button').classList.remove('hidden');
  document.getElementById('add-panel').classList.remove('panel-hidden');
}

// Удаление
document.getElementById('delete-button').addEventListener('click', async () => {
  if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;

  data.people = data.people.filter(p => p.id !== editingId);
  const githubSuccess = await saveToGitHub(data);
  if (githubSuccess) {
    populatePeopleSelect();
    clearForm();
    document.getElementById('add-panel').classList.add('panel-hidden');
  }
});

// Импорт
document.getElementById('import-button').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        data = JSON.parse(event.target.result);
        const githubSuccess = await saveToGitHub(data);
        if (githubSuccess) {
          populatePeopleSelect();
          alert('Данные импортированы.');
        }
      } catch {
        alert('Некорректный JSON файл.');
      }
    };
    reader.readAsText(file);
  }
});

// Экспорт CSV
document.getElementById('export-csv-button').addEventListener('click', () => {
  const csv = [
    'ID,Name,HeroName,Phone,Cities',
    ...data.people.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.heroName || '').replace(/"/g, '""')}"`,
      p.phone,
      `"${p.cities.map(c => `${c.name}: ${c.description || ''}`).join('; ').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'travel-data.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Шаринг
function sharePerson(id) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;

  const url = `${window.location.origin}${window.location.pathname}?person=${id}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Ссылка скопирована в буфер обмена!');
  });
}

// Валидация
function validateName(name) {
  const parts = name.split(' ').filter(part => part);
  return parts.length === 3 && parts.every(part => /^[А-ЯA-Z][а-яa-z]{1,}$/.test(part));
}

function validateHeroName(heroName) {
  const parts = heroName.split(' ').filter(part => part);
  return parts.length >= 1 && parts.every(part => /^[А-ЯA-Z][а-яa-z]{1,}$/.test(part));
}

function validatePhone(phone) {
  return /^(\+7|8)?\d{10}$/.test(phone.replace(/\D/g, ''));
}

function clearForm() {
  const nameInput = document.getElementById('name-input');
  const heroNameInput = document.getElementById('hero-name-input');
  const phoneInput = document.getElementById('phone-input');
  nameInput.value = '';
  heroNameInput.value = '';
  phoneInput.value = '';
  nameInput.classList.remove('error');
  heroNameInput.classList.remove('error');
  phoneInput.classList.remove('error');
  document.getElementById('cities-container').innerHTML = `
    <div class="city-entry">
      <label for="city-input-0">${translations[currentLang].cityLabel} 1:</label>
      <input type="text" id="city-input-0" class="city-input" placeholder="${translations[currentLang].cityPlaceholder}">
      <ul id="city-suggestions-0" class="suggestions"></ul>
      <label for="city-desc-0">${translations[currentLang].descLabel}:</label>
      <textarea id="city-desc-0" class="city-desc" placeholder="${translations[currentLang].descPlaceholder}"></textarea>
    </div>
  `;
  const firstInput = document.getElementById('city-input-0');
  firstInput.addEventListener('input', debounce(e => searchCities(e.target.value, 0), 300));
  firstInput.addEventListener('focus', () => {
    document.getElementById(`city-suggestions-0`).innerHTML = '';
  });
  cityCount = 1;
  editingId = null;
  document.getElementById('delete-button').classList.add('hidden');
}

// Темная тема
document.getElementById('theme-toggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark-theme', e.target.checked);
});
