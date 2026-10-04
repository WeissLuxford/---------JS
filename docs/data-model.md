# Модель данных

## Персонаж (документ `characters/{id}`)

Создаётся `newCharacter()` и всегда проходит через `normalize()` в `js/rules.js`.

| Поле | Тип | Смысл |
|---|---|---|
| `name` | строка до 120 | имя |
| `archived` | bool | в архиве |
| `portrait` | data URL до ~300 КБ | портрет 520×624 (webp или jpeg) |
| `info` | объект | `race, subrace, cls, subclass, level, background, alignment, age, xp, setting, patron, pactBoon, player` |
| `abilities` | `{str,dex,con,int,wis,cha}` | значения 1..30 |
| `saves` | `{key: true}` | владение спасбросками |
| `skills` | `{key: 0/1/2}` | нет / владение / компетентность |
| `hitDie` | `d6/d8/d10/d12` | кость хитов |
| `casterType` | `none/full/half/third/pact` | тип заклинателя (ячейки считаются сами) |
| `spellAbility` | ключ характеристики | заклинательная характеристика |
| `armor` | `{name, base, dexCap: full/2/0, shield, bonus}` | КД считается из этого |
| `speed`, `initBonus`, `senses`, `resistances` | | |
| `hp` | `{current, temp, maxOverride, bonusPerLevel, hitDiceUsed, deathSuccess, deathFail, stable}` | максимум хитов считается, если нет `maxOverride` |
| `slotsUsed` | `{уровень: потрачено}` | обычные ячейки |
| `pactUsed` | число | потраченные ячейки договора |
| `conditions` | `{key: true}` | состояния |
| `exhaustion` | 0..6 | |
| `concentration` | строка | имя заклинания в концентрации |
| `damageSwap` | `{enabled, from, to, label}` | хоумбрю-замена типа урона (Ледяная кровь) |
| `proficiencies` | `{armor, weapons, tools, languages}` | строки |
| `attacks`, `spells`, `features`, `items` | массивы сущностей с `id` | см. ниже |
| `coins` | `{cp, sp, ep, gp, pp}` | |
| `personality` | `{appearance, traits, ideals, bonds, flaws, backstory, allies}` | |
| `notes` | `{patron[], quests[], people[], misc}` | заметки |
| `ownerUid`, `ownerName` | | владелец (только облако) |
| `visibility` | `private` / `link` | доступ по ссылке; нет поля = `link` |
| `createdAt`, `updatedAt`, `updatedBy` | | служебные; `updatedBy = {uid, name, kind}` |

## Сущности

Все имеют строковый `id` (латиница, цифры, `-`, `_`). Поле `uses` у сущностей это число или формула: `=pb`, `=int+lvl`, `=cha` и т.п. (`evalFormula`), `used` сколько потрачено, `recharge` один из `always/short/long/dawn/none`.

- **Атака**: `name, kind (attack/save), ability (str..cha/spell/none), proficient, bonus, damage ("1d8"), addMod, dmgBonus, damageType, saveAbility, range, scaling (none/cantrip-dice/cantrip-beams), count, action, notes`
- **Заклинание**: `name, nameEn, level 0..9, school, action, castTime, range, area, duration, concentration, ritual, components, save, attack, damage[{dice,type,addMod}], scaling, upcast, castAt, onSave, description, higher, source, cost (slot/uses/free), uses, recharge, used, prepared`
- **Умение**: `name, nameEn, category (class/invocation/gift/race/background/feat/other), source (dm/own/class/race/item/""), action, recharge, uses, used, slot (none/pact), range, duration, save, damage[], description, effect`
- **Предмет**: `name, type, rarity, qty, weight, equipped, attuned, requiresAttunement, action, uses, recharge, used, damage[], description, effect, value`
- **Заметка**: `title, subtitle, status (active/done/failed), attitude (ally/neutral/hostile), text`

Справочники (типы урона, школы, действия, редкости, состояния) в начале `js/rules.js`.

## Коллекции Firestore

| Путь | Что | Кто читает | Кто пишет |
|---|---|---|---|
| `characters/{id}` | персонаж | все, если `visibility != private`; иначе владелец, редакторы, админ | владелец, редакторы, админ |
| `characters/{id}/history/{h}` | `{at, reason, by, data}` снимок до правки | владелец, редакторы, админ | они же создают, удаляет владелец |
| `characters/{id}/acl/main` | `{emails[], updatedAt}` редакторы | владелец, админ | владелец, админ |
| `invites/{email}/chars/{id}` | `{name, ownerName, ownerUid, at}` приглашение | приглашённый, админ | владелец (вместе с ACL одной транзакцией) |
| `users/{uid}` | `{name, email, photo, createdAt, lastSeen}` | сам, админ | сам |
| `bans/{uid}` | запрет аккаунта | сам, админ | админ |
| `deleted/{id}` | "надгробие" удалённого листа, чтобы id не заняли повторно | все | владелец, админ |
| `meta/rules` | проба версии правил | все | админ |
| `admin/probe` | проба прав админа | админ | никто |

Локальный режим: `localStorage` ключи `dnd.chars` (все персонажи), `dnd.hist.<id>` (история), `dnd.recent` (недавно открытые), `dnd.rulesV2` (запомненная версия правил).
