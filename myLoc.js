
"use strict";

let watchId = null;
let currentMarker = null;
let accuracyCircle = null;
let destinationMarker = null;
let currentPosition = null;

// Орієнтовні координати коледжу в Івано-Франківську.
// За потреби замініть їх на точні координати вашого навчального закладу.
const COLLEGE_LATITUDE = 48.9220;
const COLLEGE_LONGITUDE = 24.7130;

// Початковий центр карти — Івано-Франківськ.
const map = L.map("map").setView(
    [COLLEGE_LATITUDE, COLLEGE_LONGITUDE],
    13
);

// Підключення карти OpenStreetMap.
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);

// Маркер коледжу.
L.marker([COLLEGE_LATITUDE, COLLEGE_LONGITUDE])
    .addTo(map)
    .bindPopup("Коледж — точка для розрахунку відстані.");

// Отримання елементів HTML.
const statusElement = document.querySelector("#status");
const latitudeElement = document.querySelector("#latitude");
const longitudeElement = document.querySelector("#longitude");
const accuracyElement = document.querySelector("#accuracy");
const distanceElement = document.querySelector("#distance");
const updatedAtElement = document.querySelector("#updatedAt");
const historyElement = document.querySelector("#history");
const destinationStatus = document.querySelector("#destinationStatus");

const getLocationButton = document.querySelector("#getLocationButton");
const watchButton = document.querySelector("#watchButton");
const clearWatchButton = document.querySelector("#clearWatchButton");
const destinationButton = document.querySelector("#destinationButton");

// Обчислення відстані за формулою гаверсинуса.
function computeDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371;

    const toRadians = degrees => degrees * Math.PI / 180;

    const latitudeDifference = toRadians(lat2 - lat1);
    const longitudeDifference = toRadians(lon2 - lon1);

    const a =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(longitudeDifference / 2) ** 2;

    const centralAngle = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return earthRadius * centralAngle;
}

// Відображення отриманого місцезнаходження.
function displayLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    const time = new Date(position.timestamp);

    currentPosition = {
        latitude: latitude,
        longitude: longitude
    };

    latitudeElement.textContent =
        `Широта: ${latitude.toFixed(6)}`;

    longitudeElement.textContent =
        `Довгота: ${longitude.toFixed(6)}`;

    accuracyElement.textContent =
        `Точність визначення: приблизно ${Math.round(accuracy)} м`;

    const distance = computeDistance(
        latitude,
        longitude,
        COLLEGE_LATITUDE,
        COLLEGE_LONGITUDE
    );

    distanceElement.textContent =
        `Відстань до коледжу по прямій: ${distance.toFixed(2)} км`;

    updatedAtElement.textContent =
        `Час оновлення: ${time.toLocaleString("uk-UA")}`;

    statusElement.textContent =
        "Місцезнаходження успішно визначено.";

    // Оновлення основного маркера.
    if (currentMarker) {
        currentMarker.setLatLng([latitude, longitude]);
    } else {
        currentMarker = L.marker([latitude, longitude]).addTo(map);
    }

    currentMarker.bindPopup(
        `<b>Ваше місцезнаходження</b><br>` +
        `Широта: ${latitude.toFixed(6)}<br>` +
        `Довгота: ${longitude.toFixed(6)}<br>` +
        `Точність: ${Math.round(accuracy)} м<br>` +
        `Час: ${time.toLocaleString("uk-UA")}`
    );

    // Відображення приблизної зони точності.
    if (accuracyCircle) {
        accuracyCircle.setLatLng([latitude, longitude]);
        accuracyCircle.setRadius(accuracy);
    } else {
        accuracyCircle = L.circle([latitude, longitude], {
            radius: accuracy,
            color: "#2563eb",
            fillColor: "#60a5fa",
            fillOpacity: 0.15
        }).addTo(map);
    }

    // Центрування карти за поточними координатами.
    map.setView([latitude, longitude], 16);

    // Додавання маркера до історії кожного оновлення.
    const historyMarker = L.circleMarker([latitude, longitude], {
        radius: 6,
        color: "#15803d",
        fillColor: "#22c55e",
        fillOpacity: 0.9
    }).addTo(map);

    historyMarker.bindPopup(
        `<b>Зафіксоване місцезнаходження</b><br>` +
        `Широта: ${latitude.toFixed(6)}<br>` +
        `Довгота: ${longitude.toFixed(6)}<br>` +
        `Час: ${time.toLocaleString("uk-UA")}`
    );

    const historyItem = document.createElement("li");

    historyItem.textContent =
        `${time.toLocaleString("uk-UA")} — ` +
        `широта ${latitude.toFixed(6)}, ` +
        `довгота ${longitude.toFixed(6)}, ` +
        `точність ${Math.round(accuracy)} м`;

    historyElement.prepend(historyItem);
}

// Обробник помилок геолокації.
function errorHandler(error) {
    let message;

    switch (error.code) {
        case error.PERMISSION_DENIED:
            message =
                "Доступ до місцезнаходження заборонено. " +
                "Надайте дозвіл у налаштуваннях браузера.";
            break;

        case error.POSITION_UNAVAILABLE:
            message =
                "Інформація про місцезнаходження недоступна.";
            break;

        case error.TIMEOUT:
            message =
                "Час очікування визначення місцезнаходження минув.";
            break;

        default:
            message =
                "Сталася невідома помилка під час визначення місцезнаходження.";
    }

    statusElement.textContent = message;
}

// Перевірка підтримки Geolocation API.
function getMyLocation() {
    if (!navigator.geolocation) {
        statusElement.textContent =
            "Ваш браузер не підтримує Geolocation API.";
        return;
    }

    statusElement.textContent =
        "Визначення місцезнаходження...";

    navigator.geolocation.getCurrentPosition(
        displayLocation,
        errorHandler,
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// Початок відстеження місцезнаходження.
function startWatching() {
    if (!navigator.geolocation) {
        statusElement.textContent =
            "Ваш браузер не підтримує Geolocation API.";
        return;
    }

    if (watchId !== null) {
        return;
    }

    statusElement.textContent =
        "Відстеження місцезнаходження активовано...";

    watchId = navigator.geolocation.watchPosition(
        displayLocation,
        errorHandler,
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );

    watchButton.disabled = true;
    clearWatchButton.disabled = false;
}

// Зупинка відстеження.
function stopWatching() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;

        statusElement.textContent =
            "Відстеження місцезнаходження зупинено.";

        watchButton.disabled = false;
        clearWatchButton.disabled = true;
    }
}

// Введення координат пункту призначення.
function showDestination() {
    const latitude = Number(
        document.querySelector("#destinationLatitude").value
    );

    const longitude = Number(
        document.querySelector("#destinationLongitude").value
    );

    const latitudeInput =
        document.querySelector("#destinationLatitude").value.trim();

    const longitudeInput =
        document.querySelector("#destinationLongitude").value.trim();

    if (
        latitudeInput === "" ||
        longitudeInput === "" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        destinationStatus.textContent =
            "Введіть коректні координати: широта від -90 до 90, " +
            "довгота від -180 до 180.";
        return;
    }

    if (destinationMarker) {
        map.removeLayer(destinationMarker);
    }

    destinationMarker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(
            `<b>Пункт призначення</b><br>` +
            `Широта: ${latitude.toFixed(6)}<br>` +
            `Довгота: ${longitude.toFixed(6)}`
        );

    destinationMarker.openPopup();

    // Переміщення карти до введених координат.
    map.flyTo([latitude, longitude], 16);

    destinationStatus.textContent =
        `Пункт призначення: ${latitude.toFixed(6)}, ` +
        `${longitude.toFixed(6)}.`;

    if (currentPosition) {
        const distance = computeDistance(
            currentPosition.latitude,
            currentPosition.longitude,
            latitude,
            longitude
        );

        destinationStatus.textContent +=
            ` Відстань від вас по прямій: ${distance.toFixed(2)} км.`;
    }
}

// Обробники натискання кнопок.
getLocationButton.addEventListener("click", getMyLocation);
watchButton.addEventListener("click", startWatching);
clearWatchButton.addEventListener("click", stopWatching);
destinationButton.addEventListener("click", showDestination);
