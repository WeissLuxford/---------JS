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
| `armor` | `{name, base, dexCap: full/2/0, addAbility: ""/con/wis/int/cha, shield, bonus}` | КД считается из этого; `addAbility` для Защиты без доспехов |
| `speed`, `initBonus`, `senses` | | скорость в листе базовая, истощение и состояния снижают её в `compute()` |
| `resistances` | строка | заметка о защите, только для чтения глазами |
| `defenses` | `{resist[], vuln[], immune[]}` | типы урона из `DAMAGE_TYPES`; если поля нет, `normalize()` выводит его из текста `resistances` |
| `inspiration` | boolean | вдохновение |
| `effects` | список эффектов | `{id, name, preset, attack, save, check, dmg, dmgType, ac, speed, speedX2, adv[], dis[], resist[], rounds, once, mine, concName, until, note}`; `adv`/`dis` вида `attack`, `save`, `save:dex`, `check:str`; `rounds` null = пока не снимут; `mine` + `concName` снимаются вместе с концентрацией; чистит `cleanEffect()` |
| `hp` | `{current, temp, maxOverride, bonusPerLevel, hitDiceUsed, deathSuccess, deathFail, stable}` | максимум хитов считается, если нет `maxOverride` |
| `slotsUsed` | `{уровень: потрачено}` | обычные ячейки |
| `pactUsed` | число | потраченные ячейки договора |
| `conditions` | `{key: true}` | состояния |
| `exhaustion` | 0..6 | правила 2014: 1 помеха на проверки, 2 скорость вдвое, 3 помеха на атаки и спасброски, 4 максимум хитов вдвое, 5 скорость 0 |
| `concentration` | строка | имя заклинания в концентрации |
| `damageSwap` | `{enabled, from, to, label}` | хоумбрю-замена типа урона (Ледяная кровь) |
| `proficiencies` | `{armor, weapons, tools, languages}` | строки |
| `attacks`, `spells`, `features`, `items` | массивы сущностей с `id` | см. ниже |
| `coins` | `{cp, sp, ep, gp, pp}` | |
| `personality` | `{appearance, traits, ideals, bonds, flaws, backstory, allies}` | |
| `notes` | `{patron[], quests[], people[], misc[]}` | заметки; старая строка `misc` превращается в одну заметку `nt-misc-legacy` |
| `ownerUid`, `ownerName` | | владелец (только облако) |
| `visibility` | `private` / `link` | доступ по ссылке; нет поля = `link` |
| `createdAt`, `updatedAt`, `updatedBy` | | служебные; `updatedBy = {uid, name, kind}` |

## Сущности

Все имеют строковый `id` (латиница, цифры, `-`, `_`). Поле `uses` у сущностей это число или формула: `=pb`, `=int+lvl`, `=cha` и т.п. (`evalFormula`), `used` сколько потрачено, `recharge` один из `always/short/long/dawn/none`.

- **Атака**: `name, kind (attack/save), ability (str..cha/spell/none), proficient, bonus, damage ("1d8"), addMod, dmgBonus, damageType, saveAbility, range, scaling (none/cantrip-dice/cantrip-beams), count, action, notes`
- **Заклинание**: `name, nameEn, level 0..9, school, action, castTime, range, area, duration, concentration, ritual, components, save, attack, damage[{dice,type,addMod}], scaling, upcast, castAt, onSave, description, higher, source, cost (slot/uses/item/free), uses, recharge, used, prepared, combat (""/yes/no: показывать в панели боя; по умолчанию атакующие заговоры), itemId, charges, maxCharges, dcOverride, atkOverride`. При `cost: item` заклинание тратит заряды предмета `itemId`: от `charges` до `maxCharges` за раз, каждый заряд сверх минимума добавляет кубы `upcast`
- **Умение**: `name, nameEn, category (class/invocation/gift/race/background/feat/other), source (dm/own/class/race/item/""), action, recharge, uses, used, slot (none/pact), range, duration, save, damage[], description, effect`
- **Предмет**: `name, type (в т.ч. wand: палочка, жезл, посох), rarity, qty, weight, equipped, attuned, requiresAttunement, action, uses, recharge, used, damage[], description, effect, value, breakOn`. `breakOn` 1..20: после последнего заряда сайт бросает d20 и на этом числе предмет разрушается. Оружие: `atkAbility` (str/dex/finesse/spell, пусто = не оружие), `atkProf`, `atkBonus` (магический +N к попаданию и урону), `range`; первая строка `damage` это урон оружия, модификатор прибавляется сам. Доспехи: `acBase` (КД доспеха), `acDex` (full/2/0), `acBonus` (щит, кольцо). Работают, только когда надето (и настроено, если нужна настройка)
- **Заметка**: `title, subtitle, status (active/done/failed), attitude (ally/neutral/hostile), text, tags, collapsed`. `tags` строка меток через запятую, по ним фильтр в разделе; поиск идёт по всем разделам. Текст с разметкой: `## заголовок`, `**жирный**`, `*курсив*`, `__подчёркнутый__`, `~~зачёркнутый~~`, `==маркер==`, `- список`, `1. список`, `- [ ] дело`, `> цитата`, `---`. Рисует `rich()` из `ui.js`, всё экранируется до разметки.

У заклинаний, умений и предметов есть необязательное `icon` (имя из `ICON_NAMES` в `icons.js`); пусто = подбор по названию.

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
