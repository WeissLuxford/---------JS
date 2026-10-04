# Тесты и проверка

## Юнит-тесты (без зависимостей)

```
node --test tests/unit/*.test.mjs
```
Покрывают правила D&D (`rules.js`, включая состояния, сопротивления и истощение в `phase3.test.mjs`), форматирование заметок, слияние (`sync.js`), описание изменений (`changes.js`), отрисовку всех вкладок на кривых данных и XSS во всех полях. Запускаются и в GitHub Actions на каждый push (`.github/workflows/test.yml`).

## Правила доступа на эмуляторе

Нужны Java 21 и пакеты из `package.json` (`npm install`).

```
npx firebase emulators:start --only firestore,auth --project dnd-char-sheet-71645
node tests/rules/rules.test.mjs
```
Тест сам подставляет тестовый uid админа вместо `ВСТАВЬ_СВОЙ_UID`. Порт эмулятора меняется переменной `FIRESTORE_PORT`.

Для эмулятора нужен файл `firebase.json` рядом (в репозиторий не кладём):
```
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "firestore": { "host": "127.0.0.1", "port": 8080 },
    "auth": { "host": "127.0.0.1", "port": 9099 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

## Сайт на эмуляторе

1. Запустить эмуляторы (как выше) и `python3 -m http.server 8765`.
2. Открыть `http://localhost:8765/?emu#/`. Флаг `?emu` работает только на localhost.
3. Войти без Google: в консоли браузера `await window.__emuSignIn("sub-a", "alice@example.com", "Alice")`.
4. Чтобы стать админом, вставить uid вошедшего пользователя в правила эмулятора вместо тестового.

## Сквозные проверки в браузере

Playwright (`playwright-core`) с Chromium. Пример сценария: создать лист, открыть его гостем, включить ссылку, пригласить редактора, убрать, удалить лист и попробовать занять его id. В headless Chromium по умолчанию скрыты полосы прокрутки: для проверки стилей запускать с `ignoreDefaultArgs: ['--hide-scrollbars']`. Локальный режим: блокировать запросы к `gstatic.com` и `googleapis.com`.

## Чего нельзя

Никогда не писать тестовые данные в боевой Firestore. Только эмулятор или локальный режим.
